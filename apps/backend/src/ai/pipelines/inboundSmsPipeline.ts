import { Client, Customer, Lead, Message, ClientSettings } from "@prisma/client";
import { prisma } from "../../db";
import { runSentinelGuard, runOutboundSentinelGuard } from "../utils/sentinel";
import { classifyIntent } from "../utils/dial";
import { extractEntities } from "../utils/flow";
import { decideAction, RuneInput } from "../../services/rune";
import { generateReply } from "../utils/lyra";
import { logAiEvent } from "../utils/aiLogger";
import { NotificationService } from "../../services/NotificationService";
import {
  getOrCreateLead,
  updateLeadFromFlow,
  computeNextState,
  transitionLeadState,
  markBookingSent,
  markClarificationAsked,
  markEscalated,
} from "../../services/vault";

export interface HandleInboundSmsParams {
  client: Client;
  customer: Customer;
  inboundMessage: Message;
  clientSettings: ClientSettings | null;
}

export interface HandleInboundSmsResult {
  replyMessage?: string;
}

export async function handleInboundSms(
  params: HandleInboundSmsParams
): Promise<HandleInboundSmsResult> {
  const { client, customer, inboundMessage, clientSettings } = params;

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🤖 INBOUND SMS AI PIPELINE START");
  console.log(`Client: ${client.businessName}`);
  console.log(`Customer: ${customer.phone} (${customer.state})`);
  console.log(`Message: "${inboundMessage.body}"`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    console.log("0️⃣ VAULT: Loading conversation context for Sentinel...");
    const messages = await prisma.message.findMany({
      where: {
        clientId: client.id,
        customerId: customer.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });
    const context = { messages: messages.reverse() };
    console.log(`✅ VAULT: Loaded ${context.messages.length} messages`);

    console.log("1️⃣ SENTINEL: Running safety guard on inbound message...");
    const sentinelResult = await runSentinelGuard({
      clientId: client.id,
      lead: customer as any, // SENTINEL still expects old format, will be fixed separately
      messageText: inboundMessage.body,
      conversationHistory: context.messages,
    });

    if (!sentinelResult.allowed) {
      console.warn(`⚠️ SENTINEL BLOCKED: ${sentinelResult.reason}`);

      await logAiEvent({
        clientId: client.id,
        customerId: customer.id,
        direction: "SYSTEM",
        type: "EVENT",
        content: `SENTINEL blocked message: ${sentinelResult.reason}`,
        metadata: { reason: sentinelResult.reason, originalMessage: inboundMessage.body },
      }).catch(() => {}); // Best effort logging

      // CRITICAL: Throw to trigger HTTP 500 and Twilio retry
      throw new Error(`Inbound message blocked by safety guard: ${sentinelResult.reason}`);
    }
    console.log("✅ SENTINEL: Message passed safety checks");

    console.log("2️⃣ VAULT: Get or create lead...");
    let lead = await getOrCreateLead({
      clientId: client.id,
      customerId: customer.id,
    });
    console.log(`✅ VAULT: Lead ${lead.id} (state: ${lead.state})`);

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

    // Build RUNE input
    const hasBookingUrl = !!(
      clientSettings?.metadata &&
      typeof clientSettings.metadata === "object" &&
      "bookingUrl" in clientSettings.metadata &&
      clientSettings.metadata.bookingUrl
    );

    const runeInput: RuneInput = {
      intent: intentResult.intent,
      certainty: intentResult.confidence,
      flow: {
        job_type: entities.jobType,
        urgency_description: entities.urgency,
        location: entities.location,
        requested_time: entities.requestedTime,
        customer_name: entities.customerName,
        extra_notes: entities.extraDetails,
        confidence: intentResult.confidence,
      },
      config: {
        booking_link_enabled: hasBookingUrl,
      },
    };

    const decision = decideAction(runeInput);
    console.log(`✅ RUNE: Action = ${decision.action}`);
    console.log(`   Reason: ${decision.reason}`);

    console.log("5️⃣b VAULT: Update lead with FLOW data...");
    lead = await updateLeadFromFlow({ lead, entities });
    console.log(`✅ VAULT: Lead updated with FLOW data`);

    console.log("6️⃣ VAULT: Applying state transition & memory flags...");
    const nextState = computeNextState(lead.state, decision.action);
    lead = await transitionLeadState({ lead, newState: nextState });

    // Set memory flags based on action
    if (decision.action === "SEND_BOOKING_LINK" && !lead.sentBooking) {
      lead = await markBookingSent(lead.id);
    }

    if (decision.action === "SEND_CLARIFY_QUESTION" && !lead.askedClarify) {
      lead = await markClarificationAsked(lead.id);
    }

    if (decision.action === "SEND_BOOKING_AND_ALERT" && !lead.escalated) {
      lead = await markEscalated(lead.id);
    }

    console.log(`✅ VAULT: State = ${lead.state}, Flags = { sentBooking: ${lead.sentBooking}, askedClarify: ${lead.askedClarify}, escalated: ${lead.escalated} }`);

    console.log("7️⃣ LYRA: Generating reply...");

    const replyMessage = await generateReply({
      clientSettings,
      action: decision.action,
      entities,
      recentMessages: context.messages,
      businessName: client.businessName,
    });

    // URGENT ALERT: Send notification if action is SEND_BOOKING_AND_ALERT
    if (decision.action === "SEND_BOOKING_AND_ALERT") {
      console.log("🚨 ALERT: Urgent lead detected - sending notification...");
      try {
        const dashboardLink = `${process.env.FRONTEND_URL || "https://app.jobrun.com"}/admin/messages?leadId=${lead.id}`;
        await NotificationService.sendHandoverNotification(client.id, {
          conversationId: lead.id,
          customerName: customer.name || undefined,
          customerPhone: customer.phone,
          lastMessages: context.messages.slice(-3).map((m) => m.body),
          urgencyScore: 100,
          urgencyLevel: "HIGH",
          reason: `Urgent ${runeInput.flow.job_type || "issue"}: ${runeInput.flow.urgency_description || "immediate attention needed"}`,
          triggers: [decision.reason],
          dashboardLink,
        });
        console.log("✅ ALERT: Notification sent successfully");
      } catch (err) {
        console.error("❌ ALERT: Failed to send notification:", err);
      }
    }

    if (replyMessage) {
      console.log(`✅ LYRA: Generated reply (${replyMessage.length} chars)`);
      console.log(`   Reply: "${replyMessage}"`);

      // Check for LYRA parse error
      if (replyMessage === "__LYRA_PARSE_ERROR__") {
        console.error("❌ LYRA parse error detected");

        await logAiEvent({
          clientId: client.id,
          customerId: lead.customerId,
          direction: "SYSTEM",
          type: "EVENT",
          content: "LYRA parse error",
          metadata: { action: decision.action, leadId: lead.id },
        }).catch(() => {}); // Best effort logging

        // CRITICAL: Throw to trigger HTTP 500 and Twilio retry
        throw new Error("LYRA failed to generate valid response");
      }

      console.log("8️⃣ SENTINEL: Final safety check on outbound...");
      const outboundGuard = await runOutboundSentinelGuard({
        clientId: client.id,
        lead: customer as any, // SENTINEL still expects old format
        messageText: replyMessage,
      });

      if (!outboundGuard.allowed) {
        console.warn(`⚠️ SENTINEL BLOCKED OUTBOUND: ${outboundGuard.category} - ${outboundGuard.reason}`);
        console.warn(`⚠️ BLOCKED MESSAGE: "${replyMessage}"`);

        await logAiEvent({
          clientId: client.id,
          customerId: lead.customerId,
          direction: "SYSTEM",
          type: "EVENT",
          content: `SENTINEL blocked outbound: ${outboundGuard.reason}`,
          metadata: { reason: outboundGuard.reason, category: outboundGuard.category, blockedReply: replyMessage, leadId: lead.id },
        }).catch(() => {}); // Best effort logging

        // CRITICAL: Throw to trigger HTTP 500 and Twilio retry
        throw new Error(`Outbound message blocked by safety guard: ${outboundGuard.reason}`);
      }
      console.log(`✅ SENTINEL: Outbound message passed checks (${outboundGuard.category})`);

      console.log("9️⃣ LOGGER: Recording outbound message...");
      await logAiEvent({
        clientId: client.id,
        customerId: lead.customerId,
        direction: "OUTBOUND",
        type: "SMS",
        content: replyMessage,
        metadata: {
          intent: intentResult.intent,
          action: decision.action,
          entities,
          sentinelCategory: outboundGuard.category,
          leadId: lead.id,
        },
      });
      console.log("✅ LOGGER: Outbound message logged");
      console.log("📤 FINAL SMS BODY:", replyMessage);
    } else {
      console.log("✅ LYRA: No reply needed (action = NO_REPLY)");
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ INBOUND SMS PIPELINE COMPLETE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return {
      replyMessage: replyMessage || undefined,
    };

  } catch (error) {
    console.error("❌ PIPELINE ERROR:", error);

    await logAiEvent({
      clientId: client.id,
      customerId: customer.id,
      direction: "SYSTEM",
      type: "EVENT",
      content: `Pipeline error: ${error instanceof Error ? error.message : "Unknown error"}`,
      metadata: { error: String(error) },
    }).catch(() => {}); // Best effort logging

    // CRITICAL: Re-throw to trigger HTTP 500 and Twilio retry
    // Do NOT return fallback text
    throw error;
  }
}
