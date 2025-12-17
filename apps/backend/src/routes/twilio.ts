import { Router } from "express";
import twilio from "twilio";
import { prisma } from "../db";
import { resolveCustomer } from "../utils/resolveCustomer";
import { handleInboundSms } from "../ai/pipelines/inboundSmsPipeline";
import { findOrCreateConversation, addMessage } from "../modules/conversation/service";
import {
  isAdminPhone,
  parseAdminCommand,
  executeCallCommand,
  executeTextCommand,
  executePauseCommand,
  executeResumeCommand,
  getHelpText,
} from "../services/AdminCommandService";
import { sendOnboardingSms } from "../utils/onboardingSms";

const router = Router();

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const twilioNumber = process.env.TWILIO_NUMBER!;
const defaultClientId = process.env.DEFAULT_CLIENT_ID!;

const client = twilio(accountSid, authToken);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. INCOMING VOICE CALL → Return TwiML only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post("/voice", async (req, res) => {
  const from = req.body.From;
  console.log("📞 Incoming voice call from:", from);

  // Voice TwiML
  const twiml = `
    <Response>
      <Say voice="Polly.Joanna">
        Hello! This is the JobRun automated assistant.
        We'll send you a text message with next steps. Thank you!
      </Say>
      <Hangup/>
    </Response>
  `;

  res.type("text/xml");
  res.send(twiml);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. CALL STATUS CALLBACK → POST-CALL SMS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post("/status", async (req, res) => {
  const callStatus = req.body.CallStatus;
  const from = req.body.From;

  console.log(`📡 Status update: ${callStatus} from ${from}`);

  // When call is finished
  if (callStatus === "completed") {
    try {
      await sendOnboardingSms(from, twilioNumber);
      console.log("✅ Post-call onboarding SMS sent to:", from);
    } catch (err) {
      console.error("❌ Error sending post-call SMS:", err);
    }
  }

  // Handle missed / failed calls
  if (["no-answer", "busy", "failed"].includes(callStatus)) {
    try {
      await sendOnboardingSms(from, twilioNumber);
      console.log("✅ Missed-call onboarding SMS sent to:", from);
    } catch (err) {
      console.error("❌ Error sending missed-call SMS:", err);
    }
  }

  res.sendStatus(200);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. INBOUND SMS HANDLER — AI PIPELINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post("/sms", async (req, res) => {
  const from = req.body.From;
  const body = req.body.Body?.trim() || "";
  const messageSid = req.body.MessageSid;

  console.log("💬 Incoming SMS:", { from, body, messageSid });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ADMIN COMMAND DETECTION (BYPASS AI PIPELINE)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (isAdminPhone(from)) {
    console.log("👤 [ADMIN CMD] Admin message detected from:", from);

    const command = parseAdminCommand(body);
    let replyMessage: string;

    try {
      const clientRecord = await prisma.client.findUnique({
        where: { id: defaultClientId },
      });

      if (!clientRecord) {
        console.error("❌ [ADMIN CMD] Default client not found");
        return res.status(500).send("Server configuration error");
      }

      switch (command) {
        case "CALL":
          console.log("📞 [ADMIN CMD] Executing CALL command");
          replyMessage = await executeCallCommand(defaultClientId, clientRecord);
          break;

        case "TEXT":
          console.log("📤 [ADMIN CMD] Executing TEXT command");
          replyMessage = await executeTextCommand(defaultClientId, clientRecord);
          break;

        case "PAUSE":
          console.log("⏸️  [ADMIN CMD] Executing PAUSE command");
          replyMessage = await executePauseCommand(defaultClientId);
          break;

        case "RESUME":
          console.log("▶️  [ADMIN CMD] Executing RESUME command");
          replyMessage = await executeResumeCommand(defaultClientId);
          break;

        case "UNKNOWN":
        default:
          console.log("❓ [ADMIN CMD] Unknown command, sending help text");
          replyMessage = getHelpText();
          break;
      }

      console.log("✅ [ADMIN CMD] Command executed, reply:", replyMessage);

      // Return TwiML response
      const twiml = `
    <Response>
      <Message>${replyMessage}</Message>
    </Response>
  `;
      res.type("text/xml");
      return res.send(twiml);
    } catch (error) {
      console.error("❌ [ADMIN CMD] Error executing command:", error);
      const errorTwiml = `
    <Response>
      <Message>Action failed. Please try again.</Message>
    </Response>
  `;
      res.type("text/xml");
      return res.send(errorTwiml);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CUSTOMER SMS → AI PIPELINE (UNCHANGED)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  try {
    const clientRecord = await prisma.client.findUnique({
      where: { id: defaultClientId },
    });

    if (!clientRecord) {
      console.error("❌ CRITICAL: Default client not found in database");
      console.error(`   DEFAULT_CLIENT_ID: ${defaultClientId}`);
      console.error("   This should have been caught at startup");
      console.error("   Check Railway env vars match database");
      // Return 500 to trigger Twilio retry
      return res.status(500).send("Server configuration error");
    }

    const customer = await resolveCustomer({
      clientId: clientRecord.id,
      phone: from,
    });

    if (!customer || !customer.id) {
      console.error("❌ CRITICAL: Customer resolution failed - no valid id");
      // Return 500 to trigger Twilio retry
      return res.status(500).send("Customer resolution failed");
    }

    // Find or create conversation BEFORE creating message
    const conversation = await findOrCreateConversation(
      clientRecord.id,
      customer.id
    );

    // CRITICAL: Create message through conversation service with validation
    // This will throw if conversation doesn't belong to customer (prevents FK violation)
    const inboundMessage = await addMessage({
      conversationId: conversation.id,
      clientId: clientRecord.id,
      customerId: customer.id,
      direction: "INBOUND",
      type: "SMS",
      body,
      twilioSid: messageSid,
    });

    console.log("✅ Inbound message persisted:", inboundMessage.id);

    const clientSettings = await prisma.clientSettings.findUnique({
      where: { clientId: clientRecord.id },
    });

    if (!clientSettings) {
      console.error("❌ CRITICAL: ClientSettings not found for client:", clientRecord.id);
      console.error("   This should have been caught at startup");
      // Return 500 to trigger Twilio retry
      return res.status(500).send("Server configuration error");
    }

    const { replyMessage } = await handleInboundSms({
      client: clientRecord,
      customer,
      inboundMessage,
      clientSettings,
    });

    console.log("🔍 TWILIO WEBHOOK: replyMessage from pipeline:", replyMessage);

    // Only return TwiML after successful DB persistence
    if (replyMessage && replyMessage.trim().length > 0) {
      const twiml = `
    <Response>
      <Message>${replyMessage}</Message>
    </Response>
  `;

      console.log("📤 TWILIO WEBHOOK: Sending TwiML response with message");
      res.type("text/xml");
      res.send(twiml);
    } else {
      console.warn("⚠️ TWILIO WEBHOOK: No reply message - sending default TwiML");
      const defaultReply = "Thank you for your message. We'll be in touch shortly.";
      const twiml = `
    <Response>
      <Message>${defaultReply}</Message>
    </Response>
  `;
      res.type("text/xml");
      res.send(twiml);
    }

  } catch (error) {
    console.error("❌ SMS webhook error:", error);
    console.error("❌ Error details:", {
      name: (error as Error).name,
      message: (error as Error).message,
      stack: (error as Error).stack,
    });

    // CRITICAL: Return HTTP 500 to trigger Twilio retry
    // Do NOT return TwiML on failure - message must be retried
    res.status(500).send("Message processing failed");
  }
});

export default router;
