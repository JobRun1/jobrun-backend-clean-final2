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
import { handleOnboardingSms } from "../services/OnboardingService";
import { canProcessCustomerMessage, canSendSMS } from "../services/SystemGate";
import { completeOnboarding } from "../services/OnboardingGuard";

const router = Router();

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const twilioNumber = process.env.TWILIO_NUMBER!;
const defaultClientId = process.env.DEFAULT_CLIENT_ID!;

const client = twilio(accountSid, authToken);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PHONE NUMBER NORMALIZATION (handles multiple Twilio formats)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function normalizePhoneNumber(input?: string): string | null {
  if (!input) return null;

  // Remove all non-digit characters
  let normalized = input.replace(/\D/g, "");

  // Convert UK national format (07...) to international (447...)
  if (normalized.startsWith("0")) {
    normalized = "44" + normalized.substring(1);
  }

  return normalized;
}

// ONBOARDING-ONLY NUMBER (NORMALIZED - digits only)
const ONBOARDING_ONLY_NUMBER = "447476955179";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. INCOMING VOICE CALL → Test Call Detection + TwiML
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post("/voice", async (req, res) => {
  const from = req.body.From;
  const to = req.body.To;

  console.log("📞 Incoming voice call:", { from, to });

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST CALL DETECTION (ONBOARDING)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // A call qualifies as a test call ONLY if:
    // 1. To = client's dedicated Twilio number
    // 2. From = client's owner phone number (NOT any customer)
    // 3. Client's onboarding state is S8_FWD_CONFIRM
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const normalizedFrom = normalizePhoneNumber(from);
    const normalizedTo = normalizePhoneNumber(to);

    // Find client by their dedicated Twilio number
    const clientRecord = await prisma.client.findFirst({
      where: { twilioNumber: normalizedTo },
    });

    if (clientRecord && clientRecord.phoneNumber) {
      const normalizedClientPhone = normalizePhoneNumber(clientRecord.phoneNumber);

      // Check if this is the client owner calling their own number (test call)
      if (normalizedClientPhone && normalizedFrom === normalizedClientPhone) {
        console.log("🔍 Test call detected (owner phone match):", {
          from: normalizedFrom,
          clientPhone: normalizedClientPhone,
          clientId: clientRecord.id,
        });

        // Check onboarding state (owned by Client, not Customer)
        const onboardingState = await prisma.onboardingState.findUnique({
          where: { clientId: clientRecord.id },
        });

        if (onboardingState?.currentState === "S8_FWD_CONFIRM") {
          // ✅ THIS IS A TEST CALL! Advance state
          await prisma.onboardingState.update({
            where: { clientId: clientRecord.id },
            data: {
              currentState: "S9_TEST_CALL",
              testCallDetected: true,
            },
          });

          console.log("✅ Onboarding test call detected (voice):", {
            clientId: clientRecord.id,
            stateAdvanced: "S8_FWD_CONFIRM → S9_TEST_CALL",
          });
        }
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // RETURN TWIML (SAME FOR ALL CALLS)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
  } catch (error) {
    console.error("❌ /voice webhook error:", error);

    // Return safe TwiML even on error
    const errorTwiml = `
    <Response>
      <Say voice="Polly.Joanna">
        Hello! This is JobRun. Thank you for calling.
      </Say>
      <Hangup/>
    </Response>
  `;

    res.type("text/xml");
    res.send(errorTwiml);
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. CALL STATUS CALLBACK → Test Call Completion + SMS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post("/status", async (req, res) => {
  const callStatus = req.body.CallStatus;
  const from = req.body.From;
  const to = req.body.To;
  const callDuration = req.body.CallDuration || "0";

  console.log(`📡 Status update: ${callStatus} from ${from} to ${to} (duration: ${callDuration}s)`);

  try {
    const normalizedFrom = normalizePhoneNumber(from);
    const normalizedTo = normalizePhoneNumber(to);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST CALL COMPLETION DETECTION (ONBOARDING)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // A missed test call ONLY completes onboarding if:
    // 1. From = client's owner phone number
    // 2. To = client's dedicated Twilio number
    // 3. State is S9_TEST_CALL
    // 4. CallStatus is 'no-answer' or 'completed'
    // 5. CallDuration is 0 (missed call, not answered)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // Find client by their dedicated Twilio number
    const clientRecord = await prisma.client.findFirst({
      where: { twilioNumber: normalizedTo },
    });

    if (clientRecord && clientRecord.phoneNumber) {
      const normalizedClientPhone = normalizePhoneNumber(clientRecord.phoneNumber);

      // Check if this is the client owner's call
      if (normalizedClientPhone && normalizedFrom === normalizedClientPhone) {
        console.log("🔍 Checking for test call completion:", {
          from: normalizedFrom,
          clientPhone: normalizedClientPhone,
          callStatus,
          duration: callDuration,
        });

        // Check onboarding state (owned by Client, not Customer)
        const onboardingState = await prisma.onboardingState.findUnique({
          where: { clientId: clientRecord.id },
        });

        // Only complete if state is S9_TEST_CALL and call was missed (duration 0)
        if (
          onboardingState?.currentState === "S9_TEST_CALL" &&
          ["no-answer", "completed"].includes(callStatus) &&
          parseInt(callDuration) === 0
        ) {
          // ✅ TEST CALL PASSED! Mark forwardingEnabled first
          await prisma.onboardingState.update({
            where: { clientId: clientRecord.id },
            data: {
              forwardingEnabled: true,
              testCallDetected: true,
            },
          });

          // PHASE 3: Use completeOnboarding() to safely mark client complete
          // This validates ALL requirements before setting onboardingComplete = true
          const completionResult = await completeOnboarding(clientRecord.id);

          if (!completionResult.success) {
            console.error("❌ Onboarding completion failed validation:", completionResult.errors);
            console.error("   Client will remain in onboarding state");
            return res.sendStatus(200);
          }

          console.log("🎉 Onboarding test call passed:", {
            clientId: clientRecord.id,
            stateAdvanced: "S9_TEST_CALL → COMPLETE",
            onboardingComplete: true,
          });

          // Send success SMS
          const successMessage = `🎉 Perfect! JobRun is now live.

What happens next:

📞 When you miss a call, JobRun answers
💬 The caller leaves their details
📲 You get an SMS summary instantly

You're all set. First missed call = first summary.

Welcome aboard 🚀`;

          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // 🚨 FORENSIC LOGGING - Identify alert spam source
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          console.error("🚨🚨🚨 TWILIO SEND EXECUTED FROM:", __filename);
          console.error("🚨 STACK TRACE:", new Error().stack);
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

          await client.messages.create({
            to: normalizedFrom,
            from: twilioNumber,
            body: successMessage,
          });

          console.log("✅ Onboarding success SMS sent to:", normalizedFrom);

          // Early return - we're done!
          return res.sendStatus(200);
        } else if (onboardingState?.currentState === "S9_TEST_CALL" && parseInt(callDuration) > 0) {
          // User ANSWERED the call instead of missing it
          console.log("⚠️ Test call was answered (should be missed):", {
            clientId: clientRecord.id,
            duration: callDuration,
          });

          const reminderMessage = `Looks like you answered that call!

For the test, call again but DON'T answer.

Let it ring 5+ times so JobRun picks up.`;

          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // 🚨 FORENSIC LOGGING - Identify alert spam source
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          console.error("🚨🚨🚨 TWILIO SEND EXECUTED FROM:", __filename);
          console.error("🚨 STACK TRACE:", new Error().stack);
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

          await client.messages.create({
            to: normalizedFrom,
            from: twilioNumber,
            body: reminderMessage,
          });

          return res.sendStatus(200);
        }
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FALLBACK: REGULAR ONBOARDING SMS (NON-TEST CALLS)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // IMPORTANT: Onboarding SMS should be sent from client's dedicated Twilio number
    // NOT from the global onboarding number
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // When call is finished or missed/failed
    if (["completed", "no-answer", "busy", "failed"].includes(callStatus)) {
      // Validate normalized phone number
      if (!normalizedFrom) {
        console.error("❌ [STATUS] Unable to normalize 'from' phone number:", from);
        return res.sendStatus(200); // Return 200 to Twilio but skip processing
      }

      // Find or create client by owner phone
      let clientForOnboarding = await prisma.client.findFirst({
        where: { phoneNumber: normalizedFrom },
      });

      if (!clientForOnboarding) {
        console.log("📝 [STATUS] Creating new client for owner:", normalizedFrom);
        console.warn("⚠️ [STATUS] Client created without dedicated Twilio number - needs provisioning");

        clientForOnboarding = await prisma.client.create({
          data: {
            phoneNumber: normalizedFrom,
            businessName: "Onboarding in progress",
            region: "UK",
            twilioNumber: null,
          },
        });

        console.log("✅ [STATUS] New client created:", {
          clientId: clientForOnboarding.id,
          ownerPhone: normalizedFrom,
        });
      }

      // Send onboarding SMS from client's dedicated number (if available)
      // Fall back to global onboarding number if client doesn't have dedicated number yet
      const fromNumber = clientForOnboarding.twilioNumber || twilioNumber;

      if (!clientForOnboarding.twilioNumber) {
        console.warn("⚠️ [STATUS] Client has no dedicated Twilio number, using global onboarding number");
      }

      await sendOnboardingSms(normalizedFrom, fromNumber);

      console.log("✅ Onboarding SMS sent:", {
        to: normalizedFrom,
        from: fromNumber,
        clientId: clientForOnboarding.id,
        isDedicatedNumber: !!clientForOnboarding.twilioNumber,
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ /status webhook error:", error);
    res.sendStatus(200); // Always return 200 to Twilio
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. INBOUND SMS HANDLER — AI PIPELINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post("/sms", async (req, res) => {
  const from = req.body.From;
  const to = req.body.To; // CRITICAL: The number being texted
  const body = req.body.Body?.trim() || "";
  const messageSid = req.body.MessageSid;

  console.log("💬 Incoming SMS:", { from, to, body, messageSid });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HARD ROUTING GATE (DETERMINISTIC, NO AI)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //
  // PRIORITY ORDER (STRICT):
  // 1. Active onboarding state (highest priority)
  // 2. Onboarding-only number check
  // 3. Customer job pipeline (fallback only)
  //
  // GUARANTEE: If (1) or (2) matches → CUSTOMER_JOB pipeline is unreachable
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const normalizedTo = normalizePhoneNumber(to);
  const normalizedFrom = normalizePhoneNumber(from);

  if (!normalizedFrom) {
    console.error("❌ CRITICAL: Unable to normalize 'from' phone number:", from);
    return res.status(400).send("Invalid phone number");
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TIER 2: CANCELLATION FLOW REMOVED
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //
  // DELETED: SMS-based "CANCEL → YES/NO" confirmation flow (~194 lines)
  //
  // RATIONALE:
  // - Overengineered for MVP (2-step SMS confirmation, 24h timeout tracking)
  // - Fields never existed in DB (pendingCancellation, cancellationRequestedAt)
  // - Stripe native cancellation is superior when re-enabled
  // - Client can cancel via admin dashboard or support
  //
  // REPLACEMENT: Admin-driven cancellation via /api/admin/clients/:id/billing/cancel
  //
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // A) ACTIVE ONBOARDING STATE CHECK (HIGHEST PRIORITY)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Find client by owner phone (NOT by defaultClientId)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  let clientByPhone = await prisma.client.findFirst({
    where: { phoneNumber: normalizedFrom },
    include: {
      billing: true,
    },
  });

  // Check if this client has active onboarding
  if (clientByPhone) {
    const onboardingState = await prisma.onboardingState.findUnique({
      where: { clientId: clientByPhone.id },
    });

    if (onboardingState && onboardingState.currentState !== "COMPLETE") {
      console.log("ROUTING_DECISION", {
        mode: "ONBOARDING_ONLY",
        reason: "ACTIVE_ONBOARDING_STATE",
        ownerPhone: normalizedFrom,
        clientId: clientByPhone.id,
        clientTwilioNumber: clientByPhone.twilioNumber,
        state: onboardingState.currentState,
        to: normalizedTo,
      });

      try {
        const { reply } = await handleOnboardingSms({
          client: clientByPhone,
          fromPhone: from,
          userInput: body,
          messageSid,
        });

        if (reply && reply.trim().length > 0) {
          const twiml = `
    <Response>
      <Message>${reply}</Message>
    </Response>
  `;
          console.log("📤 [ONBOARDING_STATE] Sending TwiML response");
          res.type("text/xml");
          return res.send(twiml);
        } else {
          console.log("✅ [ONBOARDING_STATE] No reply needed");
          res.sendStatus(200);
          return;
        }
      } catch (error) {
        console.error("❌ [ONBOARDING_STATE] Error:", error);
        const errorTwiml = `
    <Response>
      <Message>System error. Please try again.</Message>
    </Response>
  `;
        res.type("text/xml");
        return res.send(errorTwiml);
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // B) ONBOARDING-ONLY NUMBER CHECK
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // If SMS is to the global onboarding number, create/find client by owner phone
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (normalizedTo === ONBOARDING_ONLY_NUMBER) {
    try {
      // Find or create client by owner phone
      if (!clientByPhone) {
        console.log("📝 [ONBOARDING] Creating new client for owner:", normalizedFrom);

        // TODO: Provision a dedicated Twilio number for this client
        // For now, we'll create the client without twilioNumber and flag it
        console.warn("⚠️ [ONBOARDING] Client created without dedicated Twilio number - needs provisioning");

        const newClient = await prisma.client.create({
          data: {
            phoneNumber: normalizedFrom,
            businessName: "Onboarding in progress",
            region: "UK",
            twilioNumber: null,
          },
        });

        console.log("✅ [ONBOARDING] New client created:", {
          clientId: newClient.id,
          ownerPhone: normalizedFrom,
        });

        // Refetch with billing relation
        clientByPhone = await prisma.client.findUnique({
          where: { id: newClient.id },
          include: {
            billing: true,
          },
        });

        if (!clientByPhone) {
          throw new Error("Failed to refetch newly created client");
        }
      }

      console.log("ROUTING_DECISION", {
        mode: "ONBOARDING_ONLY",
        reason: "ONBOARDING_NUMBER",
        ownerPhone: normalizedFrom,
        clientId: clientByPhone.id,
        clientTwilioNumber: clientByPhone.twilioNumber,
        to: normalizedTo,
      });

      const { reply } = await handleOnboardingSms({
        client: clientByPhone,
        fromPhone: from,
        userInput: body,
        messageSid,
      });

      if (reply && reply.trim().length > 0) {
        const twiml = `
    <Response>
      <Message>${reply}</Message>
    </Response>
  `;
        console.log("📤 [ONBOARDING_NUMBER] Sending TwiML response");
        res.type("text/xml");
        return res.send(twiml);
      } else {
        console.log("✅ [ONBOARDING_NUMBER] No reply needed");
        res.sendStatus(200);
        return;
      }
    } catch (error) {
      console.error("❌ [ONBOARDING_NUMBER] Error:", error);
      const errorTwiml = `
    <Response>
      <Message>System error. Please try again.</Message>
    </Response>
  `;
      res.type("text/xml");
      return res.send(errorTwiml);
    }
  }

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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // C) CUSTOMER JOB PIPELINE (FALLBACK ONLY)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log("ROUTING_DECISION", {
    mode: "CUSTOMER_JOB",
    reason: "FALLTHROUGH",
    to: normalizedTo,
  });

  try {
    // Fetch default client for customer job pipeline
    const clientRecord = await prisma.client.findUnique({
      where: { id: defaultClientId },
    });

    if (!clientRecord) {
      console.error("❌ CRITICAL: Default client not found in database");
      console.error(`   DEFAULT_CLIENT_ID: ${defaultClientId}`);
      return res.status(500).send("Server configuration error");
    }

    // Fetch client settings early (needed for guard checks)
    const clientSettings = await prisma.clientSettings.findUnique({
      where: { clientId: clientRecord.id },
    });

    if (!clientSettings) {
      console.error("❌ CRITICAL: ClientSettings not found for client:", clientRecord.id);
      console.error("   This should have been caught at startup");
      return res.status(500).send("Server configuration error");
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SYSTEMGATE: Can Process Customer Message?
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Centralized guard check - replaces inline onboarding check
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const guardResult = canProcessCustomerMessage(clientRecord, clientSettings);

    if (!guardResult.allowed && guardResult.blockType === 'SOFT') {
      // SOFT BLOCK: Send polite response, but NO automation
      const twiml = `
    <Response>
      <Message>${guardResult.fallbackMessage}</Message>
    </Response>
  `;

      console.log("📤 SYSTEMGATE SOFT BLOCK: Sending polite response without automation");
      res.type("text/xml");
      return res.send(twiml);
    }

    if (!guardResult.allowed && guardResult.blockType === 'HARD') {
      // HARD BLOCK: Return empty TwiML (no SMS sent)
      console.warn(`[SystemGate] HARD BLOCK: ${guardResult.reason}`);
      const emptyTwiml = `<Response></Response>`;
      res.type("text/xml");
      return res.send(emptyTwiml);
    }

    // Resolve customer for job pipeline (NOT onboarding)
    const customer = await resolveCustomer({
      clientId: defaultClientId,
      phone: from,
    });

    if (!customer || !customer.id) {
      console.error("❌ Customer resolution failed");
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

    const { replyMessage } = await handleInboundSms({
      client: clientRecord,
      customer,
      inboundMessage,
      clientSettings,
    });

    console.log("🔍 TWILIO WEBHOOK: replyMessage from pipeline:", replyMessage);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SYSTEMGATE: Can Send SMS? (OUTBOUND KILL SWITCH)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Centralized guard check - replaces inline outboundPaused check
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const smsGuard = canSendSMS(clientRecord);

    if (!smsGuard.allowed) {
      console.warn(`[SystemGate] SMS_BLOCKED: ${smsGuard.reason}`);
      console.log(`[SystemGate] Would have sent: "${replyMessage}"`);

      const emptyTwiml = `<Response></Response>`;
      res.type("text/xml");
      return res.send(emptyTwiml);
    }

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
