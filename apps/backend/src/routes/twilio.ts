import { Router } from "express";
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
import { handleOnboardingSms } from "../services/OnboardingService";
import { canProcessCustomerMessage, canSendSMS } from "../services/SystemGate";
import {
  metrics,
  MetricConversationInvariantViolationPipeline,
  MetricVoiceCallOnboardingNumberViolation,
  MetricVoiceCallOperationalNumberNoClient,
  MetricVoiceCallSystemNumber,
  MetricVoiceCallSystemFailsafeIntake,
} from "../services/Metrics";
import { getCorrelationId, buildLogContext } from "../utils/correlation";
import {
  resolveNumberRole,
  canReceiveVoiceCall,
  getNumberRoleDescription,
} from "../utils/numberRoleResolver";
import { TwilioNumberRole } from "@prisma/client";
import { sendSMS } from "../twilio/client";

const router = Router();

const twilioNumber = process.env.TWILIO_NUMBER!;
const defaultClientId = process.env.DEFAULT_CLIENT_ID!;
const systemFailsafeSmsNumber = process.env.SYSTEM_FAILSAFE_SMS_NUMBER || twilioNumber;

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
  console.error("🚨🚨🚨 HIT NEW CODE — JOBRUN VOICE — COMMIT 2026-01-03 🚨🚨🚨");
  console.log("🔥 VOICE HANDLER HIT", {
    url: req.originalUrl,
    method: req.method,
    contentType: req.headers["content-type"],
  });

  const from = req.body.From;
  const to = req.body.To;

  console.log("📞 Incoming voice call:", { from, to });

  try {
    const normalizedTo = normalizePhoneNumber(to);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // HARD GUARD: Resolve number role and forbid onboarding calls
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const numberInfo = await resolveNumberRole(normalizedTo || "");

    console.log("📞 Number role resolved for voice call:", {
      to: normalizedTo,
      role: numberInfo.role,
      source: numberInfo.source,
      clientId: numberInfo.clientId,
      description: getNumberRoleDescription(numberInfo.role),
    });

    // CRITICAL INVARIANT: Onboarding numbers CANNOT receive voice calls
    if (!canReceiveVoiceCall(numberInfo)) {
      const errorMessage = `INVARIANT VIOLATION: Voice call to ONBOARDING number ${normalizedTo}`;
      console.error("🚨🚨🚨 " + errorMessage);
      console.error("🚨 ONBOARDING IS SMS-ONLY. Voice calls are FORBIDDEN.");
      console.error("🚨 Call details:", {
        from,
        to: normalizedTo,
        role: numberInfo.role,
        timestamp: new Date().toISOString(),
      });

      // Increment metric for alerting
      metrics.increment(MetricVoiceCallOnboardingNumberViolation, {
        role: numberInfo.role,
        source: numberInfo.source,
      });

      // Return polite TwiML rejection (user-facing message)
      const rejectionTwiml = `
    <Response>
      <Say voice="Polly.Joanna">
        This number is for text messages only. Please send us a text to get started.
      </Say>
      <Hangup/>
    </Response>
  `;

      res.type("text/xml");
      return res.send(rejectionTwiml);
    }

    // Log successful guard check
    console.log("✅ Voice call guard passed:", {
      role: numberInfo.role,
      canReceiveVoice: true,
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // RETURN TWIML (SAME FOR ALL CALLS)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // NO ONBOARDING LOGIC - Voice callbacks never trigger onboarding
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
  console.error("🚨🚨🚨 HIT NEW CODE — JOBRUN STATUS — COMMIT 2026-01-03 🚨🚨🚨");
  const callStatus = req.body.CallStatus;
  const from = req.body.From;
  const to = req.body.To;
  const callDuration = req.body.CallDuration || "0";

  console.log(`📡 Status update: ${callStatus} from ${from} to ${to} (duration: ${callDuration}s)`);

  try {
    const normalizedFrom = normalizePhoneNumber(from);
    const normalizedTo = normalizePhoneNumber(to);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ROLE-BASED ROUTING (FIRST GATE - NO CLIENT LOOKUP BEFORE THIS)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Resolve number role FIRST - no onboarding inference, no fallback logic
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const numberInfo = await resolveNumberRole(normalizedTo || "");

    console.log("📞 Number role resolved for status callback:", {
      to: normalizedTo,
      from: normalizedFrom,
      callStatus,
      role: numberInfo.role,
      source: numberInfo.source,
      clientId: numberInfo.clientId,
      description: getNumberRoleDescription(numberInfo.role),
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ROUTE 1: OPERATIONAL - Client's dedicated number for customer calls
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (
      numberInfo.role === TwilioNumberRole.OPERATIONAL &&
      ["completed", "no-answer", "busy", "failed"].includes(callStatus)
    ) {
      if (!normalizedFrom) {
        console.error("❌ [OPERATIONAL] Unable to normalize 'from' phone number:", from);
        return res.sendStatus(200);
      }

      // Lookup client by their dedicated Twilio number
      const clientRecord = await prisma.client.findFirst({
        where: { twilioNumber: normalizedTo },
      });

      if (!clientRecord) {
        // ROUTE 1A: OPERATIONAL role but no client found (data consistency error)
        console.error("🚨 CRITICAL: OPERATIONAL number has no client record:", {
          to: normalizedTo,
          from: normalizedFrom,
          role: numberInfo.role,
          source: numberInfo.source,
          callStatus,
        });
        console.error("🚨 This indicates a data consistency issue!");
        console.error("🚨 Number marked OPERATIONAL but not assigned to any client");

        // Increment metric for alerting
        metrics.increment(MetricVoiceCallOperationalNumberNoClient, {
          source: numberInfo.source,
          callStatus,
        });

        return res.sendStatus(200);
      }

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🔀 ROUTING DECISION: OPERATIONAL (CUSTOMER FLOW)");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📞 [OPERATIONAL] Missed call for existing client:", {
        clientId: clientRecord.id,
        businessName: clientRecord.businessName,
        twilioNumber: normalizedTo,
        customerPhone: normalizedFrom,
        callStatus,
        smsType: "CUSTOMER_MISSED_CALL",
      });

      // Import and use operational missed-call handler
      const { routeMissedCall } = await import("../modules/messages/router");

      await routeMissedCall({
        clientId: clientRecord.id,
        from: normalizedFrom,
        to: normalizedTo || "",
        callSid: req.body.CallSid || "",
        callStatus,
      });

      console.log("✅ [OPERATIONAL] Customer missed call SMS sent");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      return res.sendStatus(200);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ROUTE 2: SYSTEM - Fail-Safe Customer Intake (Revenue Protection)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CRITICAL INVARIANT: No customer call may result in no response
    // If a customer calls an unassigned/misconfigured number, we MUST
    // send them an intake SMS to prevent lost revenue opportunities.
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (
      numberInfo.role === TwilioNumberRole.SYSTEM &&
      ["completed", "no-answer", "busy", "failed"].includes(callStatus)
    ) {
      if (!normalizedFrom) {
        console.error("❌ [SYSTEM FAILSAFE] Unable to normalize 'from' phone number:", from);
        return res.sendStatus(200);
      }

      console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.warn("⚠️  SYSTEM NUMBER CALL DETECTED - ACTIVATING FAIL-SAFE");
      console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.warn("📞 [SYSTEM FAILSAFE] Customer called unassigned number:", {
        to: normalizedTo,
        from: normalizedFrom,
        callStatus,
        role: numberInfo.role,
        isKnown: numberInfo.isKnown,
        action: "SENDING_FAILSAFE_INTAKE_SMS",
        warning: "This number should be registered in TwilioNumberPool with proper role",
      });

      try {
        // FAIL-SAFE: Send generic customer intake SMS
        // This ensures NO customer call is silently dropped (revenue protection)
        const failsafeMessage =
          "We missed your call. Please reply with details about the job you need help with and we'll get back to you shortly.";

        console.log("📤 [SYSTEM FAILSAFE] Sending fail-safe intake SMS:", {
          to: normalizedFrom,
          from: systemFailsafeSmsNumber,
          messagePreview: failsafeMessage.substring(0, 50) + "...",
        });

        // Send SMS directly - NO database records, NO client association
        // This is a pure fail-safe catch-all
        await sendSMS(
          normalizedFrom,
          systemFailsafeSmsNumber,
          failsafeMessage,
          { correlationId: getCorrelationId(req) }
        );

        // Increment metric for monitoring/alerting
        metrics.increment(MetricVoiceCallSystemFailsafeIntake, {
          isKnown: numberInfo.isKnown.toString(),
          callStatus,
        });

        // Also increment existing SYSTEM number metric for tracking
        metrics.increment(MetricVoiceCallSystemNumber, {
          isKnown: numberInfo.isKnown.toString(),
          callStatus,
        });

        console.log("✅ [SYSTEM FAILSAFE] Fail-safe intake SMS sent successfully");
        console.warn("⚠️  [SYSTEM FAILSAFE] ACTION REQUIRED:");
        console.warn("   - Assign this number to a client in TwilioNumberPool");
        console.warn("   - Or mark it with appropriate role (ONBOARDING/OPERATIONAL/SYSTEM)");
        console.warn("   - Number: " + normalizedTo);
        console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      } catch (error) {
        console.error("❌ [SYSTEM FAILSAFE] Failed to send fail-safe SMS:", {
          to: normalizedFrom,
          error: error instanceof Error ? error.message : String(error),
        });
        console.error("🚨 CRITICAL: Customer call resulted in NO response (revenue loss)");

        // Still increment metric to track failures
        metrics.increment(MetricVoiceCallSystemNumber, {
          isKnown: numberInfo.isKnown.toString(),
          callStatus,
          failsafe_failed: "true",
        });
      }

      return res.sendStatus(200);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FALLTHROUGH: No route matched (should not happen if roles are correct)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.warn("⚠️  No route matched for call status callback:", {
      role: numberInfo.role,
      callStatus,
      to: normalizedTo,
      from: normalizedFrom,
    });

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
  console.error("🚨🚨🚨 HIT NEW CODE — JOBRUN SMS — COMMIT 2026-01-03 🚨🚨🚨");
  const from = req.body.From;
  const to = req.body.To; // CRITICAL: The number being texted
  const body = req.body.Body?.trim() || "";
  const messageSid = req.body.MessageSid;

  // Extract correlation ID for distributed tracing
  const correlationId = getCorrelationId(req);

  console.log("💬 Incoming SMS:", { correlationId, from, to, body, messageSid });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // IDEMPOTENCY CHECK: Prevent duplicate processing of same Twilio message
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Twilio retries webhooks if timeout (>15s) or HTTP 500
  // Customer can press "send" multiple times
  // MessageSid is unique per Twilio message (our deduplication key)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (messageSid) {
    const existingMessage = await prisma.message.findUnique({
      where: { twilioSid: messageSid },
      select: { id: true, twilioSid: true, createdAt: true },
    });

    if (existingMessage) {
      console.log('⚠️ DUPLICATE: Message already processed (Twilio retry or duplicate send)', {
        correlationId,
        messageSid,
        existingMessageId: existingMessage.id,
        originallyProcessedAt: existingMessage.createdAt,
      });

      // Return HTTP 200 with empty TwiML (already processed, don't retry)
      // This is correct behavior - Twilio should not redeliver
      res.type('text/xml');
      return res.send('<Response></Response>');
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HARDENED ROUTING STATE MACHINE (EXPLICIT MODE-BASED)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //
  // PRIORITY ORDER (STRICT, NO FALLTHROUGH):
  // A) Active onboarding state → handleOnboardingSms()                    [EXIT]
  // B) Onboarding-only number → handleOnboardingSms()                    [EXIT]
  // C) Admin command → execute admin command                             [EXIT]
  // D) Operational conversation (mode=OPERATIONAL) → operational handler [EXIT]
  // E) Customer job pipeline (creates mode=OPERATIONAL conversations)    [EXIT]
  //
  // HARDENING GUARANTEES:
  // - Conversations have explicit mode field (ONBOARDING | OPERATIONAL)
  // - Mode is set ONCE at creation time, NEVER inferred from messages
  // - Operational conversations can NEVER reach onboarding handler
  // - Onboarding messages can NEVER reach operational handler
  // - No heuristic detection (replaced with conversation.mode checks)
  //
  // INVARIANTS ENFORCED:
  // - handleOperationalCustomerReply() validates conversation.mode === 'OPERATIONAL'
  // - All new conversations in customer job pipeline have mode='OPERATIONAL'
  // - Routing logs show conversation mode for debugging
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const normalizedTo = normalizePhoneNumber(to);
  const normalizedFrom = normalizePhoneNumber(from);

  if (!normalizedFrom) {
    console.error("❌ CRITICAL: Unable to normalize 'from' phone number:", from);
    return res.status(400).send("Invalid phone number");
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ROLE-BASED ONBOARDING GUARD (HARD FIREWALL - FIRST GATE)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CRITICAL INVARIANT: Onboarding logic can ONLY run if number role is ONBOARDING
  // OPERATIONAL and SYSTEM numbers are onboarding-dead zones, permanently.
  // This guard MUST execute before ANY onboarding state checks or logic paths.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const numberInfo = await resolveNumberRole(normalizedTo || "");

  console.log("📱 SMS number role resolved:", {
    to: normalizedTo,
    from: normalizedFrom,
    role: numberInfo.role,
    source: numberInfo.source,
    clientId: numberInfo.clientId,
    description: getNumberRoleDescription(numberInfo.role),
  });

  const isOnboardingAllowed = numberInfo.role === TwilioNumberRole.ONBOARDING;

  if (!isOnboardingAllowed) {
    console.log("🚫 ONBOARDING BLOCKED: Number role is not ONBOARDING", {
      to: normalizedTo,
      role: numberInfo.role,
      onboardingPathsDisabled: true,
    });
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
  // A) ACTIVE ONBOARDING STATE CHECK (GUARDED BY ROLE)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CRITICAL: This path is ONLY reachable if numberInfo.role === ONBOARDING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (isOnboardingAllowed) {
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
          numberRole: numberInfo.role,
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
    // B) ONBOARDING-ONLY NUMBER CHECK (GUARDED BY ROLE)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CRITICAL: This path is ONLY reachable if numberInfo.role === ONBOARDING
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
          numberRole: numberInfo.role,
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
  // D) OPERATIONAL CUSTOMER REPLY HANDLER — HARD FORK
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Customers replying to missed call job-intake SMS go here.
  // This intercepts BEFORE the AI pipeline.
  // GUARANTEED: Onboarding messages cannot reach this path.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  try {
    // Find customer record to check for existing conversation
    const customerRecord = await prisma.customer.findFirst({
      where: {
        phone: normalizedFrom,
      },
      include: {
        conversations: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              take: 10, // Get recent messages to check conversation type
            },
          },
        },
      },
    });

    if (customerRecord && customerRecord.conversations.length > 0) {
      const mostRecentConversation = customerRecord.conversations[0];

      // Import operational handler
      const { handleOperationalCustomerReply } = await import(
        '../modules/messages/operationalCustomerHandler'
      );

      // Check if this is an operational conversation (explicit mode check - NO INFERENCE)
      const isOperational = mostRecentConversation.mode === 'OPERATIONAL';

      console.log('🧭 Conversation mode resolved:', {
        conversationId: mostRecentConversation.id,
        mode: mostRecentConversation.mode,
        isOperational,
        routing: isOperational ? 'operational handler' : 'customer job pipeline',
      });

      if (isOperational) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔀 ROUTING DECISION: OPERATIONAL CUSTOMER REPLY');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📞 [OPERATIONAL] Customer replying to job-intake SMS:', {
          conversationId: mostRecentConversation.id,
          customerId: customerRecord.id,
          customerPhone: normalizedFrom,
          willUseAI: false,
          willTriggerOnboarding: false,
        });

        // Handle operational reply (parse job, notify client, confirm customer)
        await handleOperationalCustomerReply({
          conversationId: mostRecentConversation.id,
          clientId: mostRecentConversation.clientId,
          customerId: customerRecord.id,
          customerPhone: normalizedFrom,
          messageBody: body,
          twilioSid: messageSid,
          correlationId, // Pass correlation ID for tracing
        });

        console.log('✅ [OPERATIONAL] Customer reply handled (NOT sent to AI pipeline)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Return empty TwiML (response already sent by handler)
        res.type('text/xml');
        return res.send('<Response></Response>');
      }
    }
  } catch (error) {
    console.error('❌ [OPERATIONAL] Error checking operational status:', error);
    // Fall through to customer job pipeline on error
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // E) CUSTOMER JOB PIPELINE (FALLBACK ONLY)
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

    // Find or create conversation BEFORE creating message (OPERATIONAL mode - customer job flow)
    const conversation = await findOrCreateConversation(
      clientRecord.id,
      customer.id,
      'OPERATIONAL'
    );

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // INVARIANT: This pipeline should only process OPERATIONAL conversations
    // (Existing OPERATIONAL conversations should have been routed earlier)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('🧭 Conversation mode in customer job pipeline:', {
      conversationId: conversation.id,
      mode: conversation.mode,
      expected: 'OPERATIONAL',
    });

    // HARD INVARIANT: Prevent non-operational conversations from being processed
    if (conversation.mode !== 'OPERATIONAL') {
      // Increment metric for alerting
      metrics.increment(MetricConversationInvariantViolationPipeline, {
        actualMode: conversation.mode,
        expectedMode: 'OPERATIONAL',
      });

      // Structured log with correlation ID
      console.error('❌ INVARIANT VIOLATION: Non-operational conversation reached customer job pipeline',
        buildLogContext(correlationId, {
          invariantName: 'pipeline.mode_check',
          conversationId: conversation.id,
          actualMode: conversation.mode,
          expectedMode: 'OPERATIONAL',
          customerId: customer.id,
          customerPhone: from,
          clientId: clientRecord.id,
        })
      );

      // CHANGED: Send polite error to customer instead of silent drop
      // Customer needs to know something went wrong (not ghosted)
      const errorTwiml = `<Response>
  <Message>We're experiencing a technical issue. Please call us directly or try again in a few minutes. Sorry for the inconvenience!</Message>
</Response>`;

      res.type('text/xml');
      return res.send(errorTwiml);
    }

    console.log('✅ Invariant check passed: conversation is OPERATIONAL');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CRITICAL: Atomic message processing (prevents message limbo)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Transaction ensures:
    // - If AI pipeline fails, message NOT persisted (no orphaned messages)
    // - Twilio will retry on HTTP 500, whole flow runs again
    // - Idempotency check prevents duplicates on successful retry
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let inboundMessage;
    let replyMessage;

    try {
      // Wrap message creation + AI processing in transaction
      // NOTE: Long transaction (AI calls inside) but necessary for atomicity
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create message inside transaction
        const msg = await tx.message.create({
          data: {
            conversationId: conversation.id,
            clientId: clientRecord.id,
            customerId: customer.id,
            direction: "INBOUND",
            type: "SMS",
            body,
            twilioSid: messageSid,
          },
        });

        console.log("✅ Inbound message persisted (transaction):", msg.id);

        // 2. Process with AI pipeline (must succeed for commit)
        // CRITICAL: If this throws, transaction rolls back
        const { replyMessage: reply } = await handleInboundSms({
          client: clientRecord,
          customer,
          inboundMessage: msg,
          clientSettings,
        });

        return { inboundMessage: msg, replyMessage: reply };
      }, {
        maxWait: 5000,  // Wait max 5s for lock acquisition
        timeout: 30000, // Total timeout 30s (enough for AI pipeline)
      });

      inboundMessage = result.inboundMessage;
      replyMessage = result.replyMessage;

      console.log("🔍 TWILIO WEBHOOK: replyMessage from pipeline:", replyMessage);

    } catch (error) {
      console.error("❌ CRITICAL: Message processing transaction failed", {
        correlationId,
        error: error instanceof Error ? error.message : String(error),
        customerId: customer.id,
        customerPhone: from,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // IMPORTANT: Return HTTP 500 to trigger Twilio retry
      // Message NOT persisted, Twilio will redeliver
      res.status(500).send("Message processing failed - will retry");
      return;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SYSTEMGATE: Can Send SMS? (OUTBOUND KILL SWITCH)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Centralized guard check - replaces inline outboundPaused check
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const smsGuard = canSendSMS(clientRecord);

    if (!smsGuard.allowed) {
      console.warn(`[SystemGate] SMS_BLOCKED: ${smsGuard.reason}`);
      console.log(`[SystemGate] Would have sent: "${replyMessage}"`);

      // CHANGED: Send polite deflection instead of silence
      // Customer needs feedback even when system is paused
      const phoneInfo = clientRecord.phoneNumber
        ? ` at ${clientRecord.phoneNumber}`
        : ' using our main number';

      const deflectionTwiml = `<Response>
  <Message>Thanks for your message! We're temporarily unable to respond via text. Please call us directly${phoneInfo} for faster service.</Message>
</Response>`;

      res.type("text/xml");
      return res.send(deflectionTwiml);
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
