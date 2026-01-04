/**
 * CANONICAL ONBOARDING SMS MESSAGE
 *
 * This is the ONLY place where the onboarding message text exists.
 * All post-call and missed-call handlers MUST use this function.
 *
 * DO NOT duplicate this message anywhere else in the codebase.
 *
 * CRITICAL GUARD: sendOnboardingSms() can ONLY be called from onboarding-specific paths.
 * Any attempt to call from voice logic or operational paths will throw an error.
 */

import { getTwilioClient } from "../twilio/client";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ONBOARDING SMS ISOLATION GUARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INVARIANT: Onboarding SMS can ONLY be sent from onboarding-specific code paths
// This prevents voice logic or operational handlers from accidentally sending
// onboarding messages to customers.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Approved call paths for onboarding SMS
 * These are the ONLY files/functions allowed to call sendOnboardingSms()
 */
const APPROVED_ONBOARDING_PATHS = [
  'OnboardingService',      // src/services/OnboardingService.ts
  'handleOnboardingSms',    // Primary onboarding handler
  'onboardingSms.ts',       // Self (for testing/utilities)
];

/**
 * FORBIDDEN call paths (voice logic should NEVER send onboarding SMS)
 */
const FORBIDDEN_PATHS = [
  'twilio.ts',              // Voice/status webhooks
  'router.ts',              // Operational message router
  'operationalCustomerHandler', // Operational customer handler
];

/**
 * Guard function to validate onboarding SMS call path
 * Throws error if called from unauthorized location
 */
function validateOnboardingSmsCallPath(): void {
  const stack = new Error().stack || '';

  // Check for forbidden paths (voice logic)
  for (const forbiddenPath of FORBIDDEN_PATHS) {
    if (stack.includes(forbiddenPath)) {
      const errorMessage = `🚨 CRITICAL INVARIANT VIOLATION: sendOnboardingSms() called from FORBIDDEN path: ${forbiddenPath}`;
      console.error(errorMessage);
      console.error('🚨 Onboarding SMS can ONLY be sent from onboarding-specific handlers!');
      console.error('🚨 Voice logic should use sendSMS() or sendCustomerMissedCallSms() instead.');
      console.error('🚨 Stack trace:', stack);

      throw new Error(
        `Invariant violation: sendOnboardingSms() called from forbidden path (${forbiddenPath}). ` +
        `Voice logic must NOT send onboarding messages. Use sendSMS() or sendCustomerMissedCallSms() instead.`
      );
    }
  }

  // Verify at least one approved path is in stack
  const hasApprovedPath = APPROVED_ONBOARDING_PATHS.some(path => stack.includes(path));

  if (!hasApprovedPath) {
    console.warn('⚠️  WARNING: sendOnboardingSms() called from unexpected path');
    console.warn('   Expected paths:', APPROVED_ONBOARDING_PATHS);
    console.warn('   Forbidden paths:', FORBIDDEN_PATHS);
    console.warn('   Stack trace:', stack);

    // Log but don't throw (allows new approved paths to be added)
    // In production, this should be monitored via metrics
  }
}

/**
 * The one and only onboarding message (SHORT VERSION - CANONICAL)
 */
export const ONBOARDING_MESSAGE = `Welcome to JobRun 👋

To set this up, reply with:

your service + your location

Example:
Plumber from London`;

/**
 * Send the canonical onboarding SMS
 *
 * CRITICAL GUARD: This function can ONLY be called from onboarding-specific paths.
 * Throws error if called from voice logic or operational handlers.
 *
 * @param to - Customer phone number
 * @param from - Twilio phone number (optional, uses env var by default)
 * @returns Twilio message SID
 */
export async function sendOnboardingSms(
  to: string,
  from?: string
): Promise<string> {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🚨 RUNTIME TRIPWIRE: This function should NEVER be called
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // If this error appears in production logs, it means:
  // 1. dist/ contains stale compiled code
  // 2. Build pipeline failed to rebuild from source
  // 3. Old Docker layer was cached and reused
  //
  // REMOVE THIS TRIPWIRE after confirming production no longer calls this.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const errorMessage = `
🚨🚨🚨 FATAL BUILD INTEGRITY VIOLATION 🚨🚨🚨

sendOnboardingSms() was called in production.

This function has ZERO call sites in source code.
If you are seeing this error, production is running STALE COMPILED CODE.

Call Stack:
${new Error().stack}

Action Required:
1. Verify dist/ was deleted before build
2. Verify Railway rebuilt from source (not cached layer)
3. Check Dockerfile COPY commands
4. Force rebuild: railway up --detach

This error will crash the application to prevent incorrect behavior.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  console.error(errorMessage);
  throw new Error("FATAL: sendOnboardingSms() executed — BUILD IS STALE");

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GUARD: Validate this function is called from approved paths only
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  validateOnboardingSmsCallPath();

  const twilioNumber = from || process.env.TWILIO_NUMBER;

  if (!twilioNumber) {
    throw new Error("TWILIO_NUMBER not configured");
  }

  const client = getTwilioClient();

  console.log("ONBOARDING_SMS_SENT", {
    to,
    version: "SHORT_V1",
    preview: ONBOARDING_MESSAGE.slice(0, 40),
    timestamp: new Date().toISOString(),
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🚨 FORENSIC LOGGING - Identify alert spam source
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.error("🚨🚨🚨 TWILIO SEND EXECUTED FROM:", __filename);
  console.error("🚨 STACK TRACE:", new Error().stack);
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const message = await client.messages.create({
    to,
    from: twilioNumber,
    body: ONBOARDING_MESSAGE,
  });

  console.log(`✅ Onboarding SMS sent to ${to} (SID: ${message.sid})`);

  return message.sid;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CUSTOMER MISSED CALL SMS (OPERATIONAL CLIENTS ONLY)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Create customer-facing missed call message template
 */
export function getCustomerMissedCallMessage(businessName: string): string {
  return `Hi 👋 You just tried to reach ${businessName}.

We couldn't answer, but we can help now.

Please reply with what the job is and when you need it done.

Example: "Leaking pipe, today if possible"`;
}

/**
 * Send customer-facing SMS after a missed call
 *
 * IMPORTANT: This is for OPERATIONAL clients only.
 * Do NOT use this for business owner onboarding.
 *
 * @param to - Customer phone number
 * @param from - Business's Twilio number
 * @param businessName - Name of the business the customer called
 * @returns Twilio message SID
 */
export async function sendCustomerMissedCallSms(
  to: string,
  from: string,
  businessName: string
): Promise<{ sid: string; body: string }> {
  if (!from) {
    throw new Error("Twilio number (from) is required for customer SMS");
  }

  if (!businessName) {
    throw new Error("Business name is required for customer SMS");
  }

  const client = getTwilioClient();
  const messageBody = getCustomerMissedCallMessage(businessName);

  console.log("CUSTOMER_MISSED_CALL_SMS_SENT", {
    to,
    from,
    businessName,
    flow: "OPERATIONAL",
    preview: messageBody.slice(0, 50),
    timestamp: new Date().toISOString(),
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🚨 FORENSIC LOGGING - Identify alert spam source
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.error("🚨🚨🚨 TWILIO SEND EXECUTED FROM:", __filename);
  console.error("🚨 STACK TRACE:", new Error().stack);
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const message = await client.messages.create({
    to,
    from,
    body: messageBody,
  });

  console.log(`✅ Customer missed call SMS sent to ${to} (SID: ${message.sid})`);

  return { sid: message.sid, body: messageBody };
}
