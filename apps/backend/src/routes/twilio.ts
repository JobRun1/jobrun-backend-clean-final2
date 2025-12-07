import { Router } from "express";
import twilio from "twilio";
import { PrismaClient } from "@prisma/client";
import { resolveLead } from "../utils/resolveLead";
import { handleInboundSms } from "../ai/pipelines/inboundSmsPipeline";

const router = Router();
const prisma = new PrismaClient();

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
        Thanks for calling — once your call ends, you'll receive a confirmation text.
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
      await client.messages.create({
        to: from,
        from: twilioNumber,
        body:
          "Thanks for calling JobRun! Your call has now ended. " +
          "If you're onboarding your business, just reply here and our assistant will guide you through setup."
      });

      console.log("📩 Post-call SMS sent to:", from);
    } catch (err) {
      console.error("❌ Error sending post-call SMS:", err);
    }
  }

  // Handle missed / failed calls
  if (["no-answer", "busy", "failed"].includes(callStatus)) {
    try {
      await client.messages.create({
        to: from,
        from: twilioNumber,
        body:
          "Sorry we missed your call! If you're getting started with JobRun, just reply to this message and our assistant will help you."
      });

      console.log("📩 Missed-call SMS sent to:", from);
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

  try {
    const clientRecord = await prisma.client.findUnique({
      where: { id: defaultClientId },
    });

    if (!clientRecord) {
      console.error("❌ Default client not found:", defaultClientId);
      throw new Error("Client configuration error");
    }

    const lead = await resolveLead({
      clientId: clientRecord.id,
      phone: from,
    });

    const inboundMessage = await prisma.message.create({
      data: {
        clientId: clientRecord.id,
        customerId: lead.id,
        direction: "INBOUND",
        type: "SMS",
        body,
        twilioSid: messageSid,
      },
    });

    const clientSettings = await prisma.clientSettings.findUnique({
      where: { clientId: clientRecord.id },
    });

    const { replyMessage, updatedLead } = await handleInboundSms({
      client: clientRecord,
      lead,
      inboundMessage,
      clientSettings,
    });

    if (replyMessage) {
      const twiml = `
    <Response>
      <Message>${replyMessage}</Message>
    </Response>
  `;

      res.type("text/xml");
      res.send(twiml);
    } else {
      res.type("text/xml");
      res.send("<Response></Response>");
    }

  } catch (error) {
    console.error("❌ SMS webhook error:", error);

    const fallbackReply = "Sorry, I'm having trouble right now. Someone from the team will get back to you shortly.";
    const twiml = `
    <Response>
      <Message>${fallbackReply}</Message>
    </Response>
  `;

    res.type("text/xml");
    res.send(twiml);
  }
});

export default router;
