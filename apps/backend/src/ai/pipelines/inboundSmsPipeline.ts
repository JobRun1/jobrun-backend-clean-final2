import { PrismaClient, Client, Lead, Message, ClientSettings, LeadStatus } from "@prisma/client";
import { runSentinelGuard } from "../utils/sentinel";
import { getLeadContext } from "../utils/vault";
import { classifyIntent } from "../utils/dial";
import { extractEntities } from "../utils/flow";
import { decideNextAction } from "../utils/rune";
import { generateReply } from "../utils/lyra";
import { logAiEvent } from "../utils/aiLogger";

const prisma = new PrismaClient();

export interface HandleInboundSmsParams {
  client: Client;
  lead: Lead;
  inboundMessage: Message;
  clientSettings: ClientSettings | null;
}

export interface HandleInboundSmsResult {
  replyMessage?: string;
  updatedLead: Lead;
}

export async function handleInboundSms(
  params: HandleInboundSmsParams
): Promise<HandleInboundSmsResult> {
  const { client, lead, inboundMessage, clientSettings } = params;

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🤖 INBOUND SMS AI PIPELINE START");
  console.log(`Client: ${client.businessName}`);
  console.log(`Lead: ${lead.phone} (${lead.status})`);
  console.log(`Message: "${inboundMessage.body}"`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    console.log("1️⃣ SENTINEL: Running safety guard on inbound message...");
    const sentinelResult = await runSentinelGuard({
      clientId: client.id,
      lead,
      messageText: inboundMessage.body,
    });

    if (!sentinelResult.allowed) {
      console.warn(`⚠️ SENTINEL BLOCKED: ${sentinelResult.reason}`);

      await logAiEvent({
        clientId: client.id,
        leadId: lead.id,
        direction: "SYSTEM",
        type: "EVENT",
        content: `SENTINEL blocked message: ${sentinelResult.reason}`,
        metadata: { reason: sentinelResult.reason, originalMessage: inboundMessage.body },
      });

      return {
        replyMessage: "Sorry, I'm having trouble processing your message. Someone from the team will get back to you shortly.",
        updatedLead: lead,
      };
    }
    console.log("✅ SENTINEL: Message passed safety checks");

    console.log("2️⃣ VAULT: Loading conversation context...");
    const context = await getLeadContext({
      clientId: client.id,
      leadId: lead.id,
    });
    console.log(`✅ VAULT: Loaded ${context.messages.length} messages`);

    console.log("3️⃣ DIAL: Classifying intent...");
    const intentResult = await classifyIntent({
      text: inboundMessage.body,
      context: context.messages,
    });
    console.log(`✅ DIAL: Intent = ${intentResult.intent} (confidence: ${intentResult.confidence.toFixed(2)})`);

    console.log("4️⃣ FLOW: Extracting entities...");
    const entities = await extractEntities({
      text: inboundMessage.body,
      context: context.messages,
      intent: intentResult.intent,
    });
    console.log(`✅ FLOW: Extracted entities:`, entities);

    console.log("5️⃣ RUNE: Deciding next action...");
    const decision = await decideNextAction({
      lead,
      intent: intentResult.intent,
      entities,
      clientSettings,
      messageCount: context.messages.length,
    });
    console.log(`✅ RUNE: Action = ${decision.action}, StateEvent = ${decision.stateEvent || "none"}`);
    console.log(`   Explanation: ${decision.explanation}`);

    console.log("6️⃣ STATE MACHINE: Applying state transition...");
    let updatedLead = lead;
    if (decision.stateEvent) {
      const newStatus = computeNewStatus(lead.status, decision.stateEvent);
      if (newStatus !== lead.status) {
        updatedLead = await prisma.lead.update({
          where: { id: lead.id },
          data: { status: newStatus },
        });
        console.log(`✅ STATE: ${lead.status} → ${newStatus}`);
      } else {
        console.log(`✅ STATE: No change (${lead.status})`);
      }
    } else {
      console.log("✅ STATE: No transition triggered");
    }

    console.log("7️⃣ LYRA: Generating reply...");
    const replyMessage = await generateReply({
      clientSettings,
      action: decision.action,
      intent: intentResult.intent,
      entities,
      recentMessages: context.messages,
      businessName: client.businessName,
    });

    if (replyMessage) {
      console.log(`✅ LYRA: Generated reply (${replyMessage.length} chars)`);
      console.log(`   Reply: "${replyMessage}"`);

      console.log("8️⃣ SENTINEL: Final safety check on outbound...");
      const outboundGuard = await runSentinelGuard({
        clientId: client.id,
        lead: updatedLead,
        messageText: replyMessage,
      });

      if (!outboundGuard.allowed) {
        console.warn(`⚠️ SENTINEL BLOCKED OUTBOUND: ${outboundGuard.reason}`);

        await logAiEvent({
          clientId: client.id,
          leadId: lead.id,
          direction: "SYSTEM",
          type: "EVENT",
          content: `SENTINEL blocked outbound: ${outboundGuard.reason}`,
          metadata: { reason: outboundGuard.reason, blockedReply: replyMessage },
        });

        return {
          replyMessage: "Thank you for your message. Someone from the team will get back to you shortly.",
          updatedLead,
        };
      }
      console.log("✅ SENTINEL: Outbound message passed checks");

      console.log("9️⃣ LOGGER: Recording outbound message...");
      await logAiEvent({
        clientId: client.id,
        leadId: updatedLead.id,
        direction: "OUTBOUND",
        type: "SMS",
        content: replyMessage,
        metadata: {
          intent: intentResult.intent,
          action: decision.action,
          entities,
        },
      });
      console.log("✅ LOGGER: Outbound message logged");
    } else {
      console.log("✅ LYRA: No reply needed (action = NO_REPLY)");
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ INBOUND SMS PIPELINE COMPLETE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return {
      replyMessage: replyMessage || undefined,
      updatedLead,
    };

  } catch (error) {
    console.error("❌ PIPELINE ERROR:", error);

    await logAiEvent({
      clientId: client.id,
      leadId: lead.id,
      direction: "SYSTEM",
      type: "EVENT",
      content: `Pipeline error: ${error instanceof Error ? error.message : "Unknown error"}`,
      metadata: { error: String(error) },
    });

    return {
      replyMessage: "Sorry, I'm having trouble right now. Someone from the team will get back to you shortly.",
      updatedLead: lead,
    };
  }
}

function computeNewStatus(currentStatus: LeadStatus, stateEvent: string): LeadStatus {
  if (stateEvent === "CONTACTED" && currentStatus === "NEW") {
    return "CONTACTED";
  }

  if (stateEvent === "QUALIFIED" && (currentStatus === "NEW" || currentStatus === "CONTACTED")) {
    return "QUALIFIED";
  }

  if (stateEvent === "CONVERTED") {
    return "CONVERTED";
  }

  if (stateEvent === "LOST") {
    return "LOST";
  }

  return currentStatus;
}
