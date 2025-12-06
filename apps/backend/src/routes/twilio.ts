import { Router } from "express";
import twilio from "twilio";

const router = Router();

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const twilioNumber = process.env.TWILIO_NUMBER!;

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
// 3. INBOUND SMS HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post("/sms", async (req, res) => {
  const from = req.body.From;
  const body = req.body.Body?.trim() || "";

  console.log("💬 Incoming SMS:", { from, body });

  // Simple auto-reply for now
  const reply =
    "Thanks for contacting JobRun! This number is monitored by our automated assistant. " +
    "How can we help you get set up today?";

  const twiml = `
    <Response>
      <Message>${reply}</Message>
    </Response>
  `;

  res.type("text/xml");
  res.send(twiml);
});

export default router;
