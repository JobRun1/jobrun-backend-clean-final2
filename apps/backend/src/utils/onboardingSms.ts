/**
 * CANONICAL ONBOARDING SMS MESSAGE
 *
 * This is the ONLY place where the onboarding message text exists.
 * All post-call and missed-call handlers MUST use this function.
 *
 * DO NOT duplicate this message anywhere else in the codebase.
 */

import { getTwilioClient } from "../twilio/client";

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
 * @param to - Customer phone number
 * @param from - Twilio phone number (optional, uses env var by default)
 * @returns Twilio message SID
 */
export async function sendOnboardingSms(
  to: string,
  from?: string
): Promise<string> {
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
