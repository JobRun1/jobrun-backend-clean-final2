import { Router } from "express";
import { Twilio } from "twilio";

const router = Router();

// Load env
const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const twilioNumber = process.env.TWILIO_NUMBER!;
const client = new Twilio(accountSid, authToken);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1) VOICE WEBHOOK — When someone CALLS your Twilio number
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post("/voice", async (req, res) => {
  console.log("📞 Incoming voice call from:", req.body.From);

  // Simple TwiML welcome message
  const twiml = `
    <Response>
      <Say voice="Polly.Joanna">
        Hello! This is the JobRun automated assistant.
        Your call has been received successfully.
      </Say>
      <Hangup/>
    </Response>
  `;

  res.type("text/xml");
  res.send(twiml);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2) STATUS CALLBACK — Twilio call/SMS lifecycle events
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post("/status", (req, res) => {
  console.log("📡 Twilio Status Callback Received:");
  console.log(req.body);

  // Must respond with 200 to tell Twilio all is well
  res.sendStatus(200);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3) OPTIONAL: Inbound SMS webhook
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post("/sms", async (req, res) => {
  const from = req.body.From;
  const body = req.body.Body;

  console.log(`💬 Incoming SMS from ${from}: ${body}`);

  const reply = `
    <Response>
      <Message>Thanks! JobRun backend received your message.</Message>
    </Response>
  `;

  res.type("text/xml");
  res.send(reply);
});

export default router;
