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
 * The one and only onboarding message
 */
export const ONBOARDING_MESSAGE = `Thanks for calling 👋

JobRun helps service businesses stop losing jobs from missed calls.

When someone can't get through, JobRun:
• Texts them back instantly
• Collects job details and urgency
• Alerts you in real time

To see how it works or start onboarding, reply with:
BUSINESS – what you do
AREA – where you operate

Example:
Emergency plumber in Leeds`;

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

  // Production verification marker
  console.log("🚀 [ONBOARDING-V2] NEW canonical onboarding SMS active");

  const client = getTwilioClient();

  const message = await client.messages.create({
    to,
    from: twilioNumber,
    body: ONBOARDING_MESSAGE,
  });

  console.log(`📩 Onboarding SMS sent to ${to} (SID: ${message.sid})`);

  return message.sid;
}
