/**
 * ONBOARDING SERVICE — PRODUCTION-READY STATE MACHINE
 *
 * This service handles the onboarding-only SMS flow for Twilio number 07476955179.
 *
 * CRITICAL ASSUMPTIONS:
 * - Hard gate in twilio.ts ensures ONLY onboarding messages reach this service
 * - Sentinel/Dial/Flow/Lyra are BYPASSED for onboarding
 * - Initial onboarding SMS sent by server after call
 * - OpenAI handles extraction only
 */

import { prisma } from "../db";
import { Client, OnboardingState, ClientBilling } from "@prisma/client";
import { LLMClient } from "../llm/LLMClient";
import { allocateTwilioNumber } from "./TwilioNumberPoolService";
import { OpenAIFailureTracker } from "./OpenAIFailureTracker";
import { getPaymentActivationMessage, getTrialUsedMessage } from "../messaging/paymentMessaging";
import { isPaymentValid } from "../utils/billingUtils";

// Type for Client with billing relation
type ClientWithBilling = Client & {
  billing: ClientBilling | null;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PHONE NUMBER NORMALIZATION
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type OnboardingStateValue =
  | "S1_BUSINESS_TYPE_LOCATION"
  | "S2_BUSINESS_NAME"
  | "S3_OWNER_NAME"
  | "S4_NOTIFICATION_PREF"
  | "S5_CONFIRM_LIVE"
  | "S6_PHONE_TYPE"
  | "S7_FWD_SENT"
  | "S8_FWD_CONFIRM"
  | "S9_TEST_CALL"
  | "COMPLETE";

type ExtractionAction = "ACCEPT" | "REJECT" | "COMPLETE" | "ERROR";

interface ExtractionResponse {
  action: ExtractionAction;
  reply: string;
  extracted: Record<string, any> | null;
  next_state: OnboardingStateValue | null;
}

interface OnboardingContext {
  mode: "ONBOARDING";
  state: OnboardingStateValue;
  collected_fields: Record<string, any>;
  user_input: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CANONICAL REPLIES (SINGLE SOURCE OF TRUTH)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CANONICAL_REPLIES: Record<OnboardingStateValue, Record<string, string[]>> = {
  S1_BUSINESS_TYPE_LOCATION: {
    ACCEPT: ["Got it. What is the name of your business?"],
    REJECT: ["Please reply with:\n\nyour service + your location\n\nExample:\nPlumber from London"],
  },
  S2_BUSINESS_NAME: {
    ACCEPT: ["Thanks. What is your name?"],
    REJECT: ["Please reply with the name of your business."],
  },
  S3_OWNER_NAME: {
    ACCEPT: ["How would you like to receive job alerts? Reply SMS."],
    REJECT: ["Please reply with your name."],
  },
  S4_NOTIFICATION_PREF: {
    ACCEPT: [
      "Perfect. When a call is missed, I'll text the customer, gather details, and alert you by SMS.\n\nReply YES to activate JobRun.",
    ],
    REJECT: ["Please reply SMS."],
  },
  S5_CONFIRM_LIVE: {
    ACCEPT: [
      "Perfect! Last step to go live 🚀\n\nWhich phone do you use for your business?\n\nReply with:\n1 = iPhone\n2 = Android\n3 = Landline/Office phone\n\nThis takes 60 seconds.",
    ],
    REJECT: ["Reply YES to activate JobRun."],
  },
  S6_PHONE_TYPE: {
    ACCEPT: [
      "Great! Setting up call forwarding now...",
    ],
    REJECT: ["Hmm, I didn't catch that.\n\nReply with just the number:\n1 = iPhone\n2 = Android\n3 = Landline"],
  },
  S7_FWD_SENT: {
    ACCEPT: [
      "Great! Let's test it.\n\n📞 Call your business number from another phone\n⏱️ Let it ring 5+ times (don't answer!)\n📲 You should get a text from JobRun\n\nTry it now. I'll wait here.",
    ],
    REJECT: ["Please reply DONE once you've completed the setup."],
  },
  S8_FWD_CONFIRM: {
    ACCEPT: [
      "Waiting for your test call...",
    ],
    REJECT: ["Please make your test call and let it ring."],
  },
  S9_TEST_CALL: {
    ACCEPT: [
      "Test call detected! Verifying...",
    ],
    REJECT: ["Still waiting for missed call."],
  },
  COMPLETE: {},
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  OPENAI EXTRACTION PROMPT (INJECTED WITH CONTEXT)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildExtractionPrompt(context: OnboardingContext): string {
  return `You are an internal extraction engine for JobRun's ONBOARDING-ONLY SMS flow.

You are NOT a chatbot.
You are NOT a customer service assistant.
You are NOT allowed to judge relevance, safety, or business type.

Your output is machine-consumed and strictly validated.
If you deviate from instructions, your response will be discarded.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE CONSTRAINTS (NON-NEGOTIABLE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Output VALID JSON ONLY
• No markdown
• No explanations
• No emojis
• No extra keys
• No conversational filler
• Deterministic (temperature = 0)
• Assume NO conversation history
• Treat input as stateless
• DO NOT apply domain, safety, or relevance filtering
• DO NOT reject based on business type

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INJECTED CONTEXT (AUTHORITATIVE — DO NOT INFER)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODE = ${context.mode}
STATE = ${context.state}
COLLECTED_FIELDS = ${JSON.stringify(context.collected_fields)}

Rules:
• MODE will always be "ONBOARDING"
• You MUST respect STATE exactly
• You MUST NOT infer or guess state
• If MODE ≠ "ONBOARDING" → return ERROR

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATE MACHINE (FIXED & FINAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

S1_BUSINESS_TYPE_LOCATION
  • expects: business_type, service_location
  • next_state: S2_BUSINESS_NAME

S2_BUSINESS_NAME
  • expects: business_name
  • next_state: S3_OWNER_NAME

S3_OWNER_NAME
  • expects: owner_name
  • next_state: S4_NOTIFICATION_PREF

S4_NOTIFICATION_PREF
  • expects: notification_preference
  • ONLY valid value: "SMS"
  • next_state: S5_CONFIRM_LIVE

S5_CONFIRM_LIVE
  • expects: confirm_live
  • ONLY valid value: "YES"
  • next_state: S6_PHONE_TYPE

S6_PHONE_TYPE
  • expects: phone_type
  • Valid values: "IPHONE", "ANDROID", "LANDLINE"
  • Matches: "1" / "iphone" → "IPHONE", "2" / "android" → "ANDROID", "3" / "landline" / "office" → "LANDLINE"
  • next_state: S7_FWD_SENT

S7_FWD_SENT
  • expects: forwarding_done
  • ONLY valid value: "DONE"
  • Matches: "done", "ready", "set", "complete", "finished", "yes"
  • next_state: S8_FWD_CONFIRM

S8_FWD_CONFIRM
  • expects: test_call_ready
  • This state waits for user confirmation they're ready to test
  • Auto-advanced by system when test call detected
  • next_state: S9_TEST_CALL (auto-advanced by /voice webhook)

S9_TEST_CALL
  • Auto-advanced by system when missed call detected
  • next_state: COMPLETE (auto-advanced by /status webhook)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT SCHEMA (STRICT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "action": "ACCEPT" | "REJECT" | "COMPLETE" | "ERROR",
  "reply": string,
  "extracted": object | null,
  "next_state": string | null
}

Rules:
• ACCEPT / COMPLETE → extracted MUST be object
• REJECT / ERROR → extracted MUST be null
• COMPLETE → next_state MUST be null
• REJECT → next_state MUST be null

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CANONICAL REPLIES (EXACT — MATCH CHARACTER FOR CHARACTER)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

S1_BUSINESS_TYPE_LOCATION
  • ACCEPT: "Got it. What is the name of your business?"
  • REJECT: "Please reply with your service and location.\\n\\nExample:\\nPlumber from London"

S2_BUSINESS_NAME
  • ACCEPT: "Thanks. What is your name?"
  • REJECT: "Please reply with the name of your business."

S3_OWNER_NAME
  • ACCEPT: "How would you like to receive job alerts? Reply SMS."
  • REJECT: "Please reply with your name."

S4_NOTIFICATION_PREF
  • ACCEPT: "Perfect. When a call is missed, I'll text the customer, gather details, and alert you by SMS.\\n\\nReply YES to activate JobRun."
  • REJECT: "Please reply SMS."

S5_CONFIRM_LIVE
  • ACCEPT: "Perfect! Last step to go live 🚀\\n\\nWhich phone do you use for your business?\\n\\nReply with:\\n1 = iPhone\\n2 = Android\\n3 = Landline/Office phone\\n\\nThis takes 60 seconds."
  • REJECT: "Reply YES to activate JobRun."

S6_PHONE_TYPE
  • ACCEPT: "Great! Setting up call forwarding now..."
  • REJECT: "Hmm, I didn't catch that.\\n\\nReply with just the number:\\n1 = iPhone\\n2 = Android\\n3 = Landline"

S7_FWD_SENT
  • ACCEPT: "Great! Let's test it.\\n\\n📞 Call your business number from another phone\\n⏱️ Let it ring 5+ times (don't answer!)\\n📲 You should get a text from JobRun\\n\\nTry it now. I'll wait here."
  • REJECT: "Please reply DONE once you've completed the setup."

S8_FWD_CONFIRM
  • ACCEPT: "Waiting for your test call..."
  • REJECT: "Please make your test call and let it ring."

S9_TEST_CALL
  • ACCEPT: "Test call detected! Verifying..."
  • REJECT: "Still waiting for missed call."

ERROR (ANY STATE)
  "System error. Please try again."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NORMALIZATION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

business_type:
  • lowercase
  • remove urgency words (emergency, urgent, asap)
  • allow ANY service (no restrictions)

service_location:
  • preserve capitalization
  • city / town / region

business_name:
  • preserve formatting
  • 2–60 characters

owner_name:
  • preserve formatting

notification_preference:
  • MUST be "SMS"

confirm_live:
  • MUST be "YES"

phone_type:
  • Map: "1" / "iphone" → "IPHONE"
  • Map: "2" / "android" → "ANDROID"
  • Map: "3" / "landline" / "office" → "LANDLINE"
  • Uppercase result

forwarding_done:
  • Map: "done" / "ready" / "set" / "complete" / "finished" / "yes" → "DONE"
  • Uppercase result

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL BEHAVIOR RULES (THIS FIXES YOUR BUG)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

During ONBOARDING:
• IGNORE urgency language
• IGNORE job descriptions
• IGNORE service category
• NEVER apply "home services" logic
• NEVER reject based on business type
• ALWAYS treat sender as a business owner

Example (VALID at S1):
Input: "K-9 waste police in Alcester"
Extract: {
  "business_type": "k-9 waste police",
  "service_location": "Alcester"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REJECTION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REJECT only if:
• Required field for current state is missing
• Input is empty / emojis-only / numbers-only
• Input is vague or incomplete at S1
• At S4 input ≠ "SMS"
• At S5 input ≠ "YES"
• At S6 input not in ["1", "2", "3", "iphone", "android", "landline", "office"]
• At S7 input not in ["done", "ready", "set", "complete", "finished", "yes"]

Do NOT advance state on REJECT.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL SELF-CHECK (MANDATORY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before outputting:
• JSON only ✓
• action valid ✓
• reply is canonical ✓
• extracted present iff required ✓
• next_state valid or null ✓

If ANY check fails → output ERROR.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INPUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODE = ${context.mode}
STATE = ${context.state}
COLLECTED_FIELDS = ${JSON.stringify(context.collected_fields)}
USER_INPUT = ${context.user_input}

Output valid JSON only.`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  OPENAI EXTRACTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function extractWithOpenAI(context: OnboardingContext): Promise<ExtractionResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  // HARDENING: Fallback if API key missing (prevents full onboarding failure)
  if (!apiKey) {
    console.error("❌ [OPENAI] OPENAI_API_KEY not configured - using fallback");
    return {
      action: "REJECT",
      reply: CANONICAL_REPLIES[context.state]?.["REJECT"]?.[0] || "Please try again.",
      extracted: null,
      next_state: null,
    };
  }

  const llmClient = new LLMClient();

  console.log("🤖 [OPENAI] Invoking extraction engine...");
  console.log(`   State: ${context.state}`);
  console.log(`   Input: "${context.user_input}"`);

  try {
    const response = await llmClient.generate({
      model: "gpt-4o-mini",
      systemPrompt: buildExtractionPrompt(context),
      userPrompt: context.user_input,
      temperature: 0, // CRITICAL: Deterministic
      maxTokens: 1024,
      jsonMode: true, // CRITICAL: Force JSON output
    });

    const rawText = response.content;

    console.log("ONBOARDING_EXTRACTION", {
      provider: "openai",
      input: context.user_input,
      result: rawText,
    });

    // Parse JSON
    const parsed: ExtractionResponse = JSON.parse(rawText);

    console.log(`✅ [OPENAI] Parsed action: ${parsed.action}`);
    console.log(`✅ [OPENAI] Next state: ${parsed.next_state || "null"}`);

    // Track successful extraction
    OpenAIFailureTracker.recordSuccess();

    return parsed;
  } catch (error) {
    console.error("❌ [OPENAI] Extraction failed:", error);

    // Track failure for alerting
    const errorMessage = error instanceof Error ? error.message : String(error);
    OpenAIFailureTracker.recordFailure(errorMessage);

    // HARDENING: Return REJECT instead of ERROR (allows retry)
    return {
      action: "REJECT",
      reply: CANONICAL_REPLIES[context.state]?.["REJECT"]?.[0] || "Please try again.",
      extracted: null,
      next_state: null,
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  REPLY WHITELIST ENFORCEMENT (HARD)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function enforceReplyWhitelist(
  currentState: OnboardingStateValue,
  action: ExtractionAction,
  extractedReply: string
): string {
  const whitelist = CANONICAL_REPLIES[currentState]?.[action];

  if (!whitelist || whitelist.length === 0) {
    console.warn(`⚠️ [WHITELIST] No whitelist for ${currentState}:${action} — allowing reply`);
    return extractedReply;
  }

  const isWhitelisted = whitelist.some((allowed) => extractedReply.trim() === allowed.trim());

  if (isWhitelisted) {
    console.log(`✅ [WHITELIST] Reply is canonical`);
    return extractedReply;
  }

  // NON-CANONICAL REPLY DETECTED - REPLACE
  console.error(`❌ [WHITELIST] VIOLATION DETECTED`);
  console.error(`   State: ${currentState}`);
  console.error(`   Action: ${action}`);
  console.error(`   LLM reply: "${extractedReply}"`);
  console.error(`   Expected one of: ${JSON.stringify(whitelist)}`);

  const canonicalReply = whitelist[0];
  console.log(`🔁 [WHITELIST] REPLACING with canonical: "${canonicalReply}"`);

  return canonicalReply;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SERVER-SIDE FIELD NORMALIZATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function normalizeExtractedFields(
  currentState: OnboardingStateValue,
  extracted: Record<string, any> | null
): Record<string, any> {
  if (!extracted) return {};

  const normalized: Record<string, any> = {};

  // S1: business_type + service_location
  if (currentState === "S1_BUSINESS_TYPE_LOCATION") {
    if (extracted.business_type) {
      normalized.business_type = extracted.business_type
        .toLowerCase()
        .replace(/\b(emergency|urgent|asap)\b/gi, "")
        .trim();
    }

    if (extracted.service_location) {
      normalized.service_location = extracted.service_location.trim();
    }
  }

  // S2: business_name
  if (currentState === "S2_BUSINESS_NAME") {
    if (extracted.business_name) {
      normalized.business_name = extracted.business_name.trim().substring(0, 60);
    }
  }

  // S3: owner_name
  if (currentState === "S3_OWNER_NAME") {
    if (extracted.owner_name) {
      normalized.owner_name = extracted.owner_name.trim();
    }
  }

  // S4: notification_preference (MUST be "SMS")
  if (currentState === "S4_NOTIFICATION_PREF") {
    normalized.notification_preference = "SMS";
  }

  // S5: confirm_live (MUST be "YES")
  if (currentState === "S5_CONFIRM_LIVE") {
    normalized.confirm_live = "YES";
  }

  // S6: phone_type (map to IPHONE/ANDROID/LANDLINE)
  if (currentState === "S6_PHONE_TYPE") {
    if (extracted.phone_type) {
      normalized.phone_type = extracted.phone_type.toUpperCase();
    }
  }

  // S7: forwarding_done (MUST be "DONE")
  if (currentState === "S7_FWD_SENT") {
    normalized.forwarding_done = "DONE";
  }

  // S8 & S9: Auto-advanced by webhooks (no extraction needed)

  console.log(`🔧 [NORMALIZE] Normalized fields:`, normalized);

  return normalized;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  FORWARDING INSTRUCTIONS GENERATOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateForwardingInstructions(phoneType: string, twilioNumber: string): string {
  // Format Twilio number for display (assumes E.164 format like +447123456789)
  const formattedNumber = twilioNumber.startsWith("+") ? twilioNumber : `+${twilioNumber}`;

  if (phoneType === "IPHONE") {
    return `📱 iPhone Setup (30 seconds)

1. Open Phone app
2. Tap your profile (top right)
3. Scroll to "Call Forwarding"
4. Enable "When Busy or Unanswered"
5. Enter this number:
   ${formattedNumber}

Done? Reply DONE`;
  }

  if (phoneType === "ANDROID") {
    return `📱 Android Setup (30 seconds)

1. Open Phone app
2. Tap ⋮ (3 dots) → Settings
3. Tap "Call forwarding"
4. Tap "When unanswered"
5. Enter this number:
   ${formattedNumber}

Done? Reply DONE`;
  }

  if (phoneType === "LANDLINE") {
    return `📞 Landline Setup

Call your phone provider and ask to enable:

"Conditional call forwarding for unanswered calls to: ${formattedNumber}"

Most providers do this free over the phone.

Once done, reply DONE`;
  }

  // Fallback (shouldn't happen with proper validation)
  return `Please set up call forwarding to: ${formattedNumber}\n\nReply DONE when complete.`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TWO-TIER IDEMPOTENCY CHECK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function checkIdempotency(
  clientId: string,
  messageSid: string
): Promise<boolean> {
  // TIER 1: Redis check (fast path) — NOT IMPLEMENTED YET
  // TODO: Add Redis check here when available

  // TIER 2: Database check (fallback)
  const state = await prisma.onboardingState.findUnique({
    where: { clientId },
  });

  if (state && state.lastMessageSid === messageSid) {
    console.log(`🔒 [IDEMPOTENCY] Message already processed: ${messageSid}`);
    return true;
  }

  return false;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MAIN ONBOARDING HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function handleOnboardingSms(params: {
  client: ClientWithBilling;
  fromPhone: string;
  userInput: string;
  messageSid: string;
}): Promise<{ reply: string }> {
  const { client, fromPhone, userInput, messageSid } = params;

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔒 [ONBOARDING] HANDLER START");
  console.log(`   Client: ${client.id} (${client.businessName})`);
  console.log(`   From: ${fromPhone}`);
  console.log(`   Input: "${userInput}"`);
  console.log(`   MessageSid: ${messageSid}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // 0. OWNER PHONE VALIDATION (CRITICAL)
    // Onboarding is driven by SMS FROM client.phoneNumber only
    const normalizedFrom = normalizePhoneNumber(fromPhone);
    const normalizedOwner = normalizePhoneNumber(client.phoneNumber || "");

    if (!normalizedOwner || normalizedFrom !== normalizedOwner) {
      console.log("❌ [ONBOARDING] SMS not from client owner — ignoring");
      console.log(`   From: ${normalizedFrom}, Owner: ${normalizedOwner}`);
      return { reply: "" }; // Silently ignore non-owner messages
    }

    console.log("✅ [ONBOARDING] Owner phone validated");

    // 1. IDEMPOTENCY CHECK
    const alreadyProcessed = await checkIdempotency(client.id, messageSid);
    if (alreadyProcessed) {
      console.log("⚠️ [ONBOARDING] Message already processed — returning 200 without reply");
      return { reply: "" }; // Return empty to prevent duplicate SMS
    }

    // 2. LOAD OR CREATE STATE
    let state = await prisma.onboardingState.findUnique({
      where: { clientId: client.id },
    });

    if (!state) {
      console.log("📝 [ONBOARDING] Creating new onboarding state for client");
      state = await prisma.onboardingState.create({
        data: {
          clientId: client.id,
          currentState: "S1_BUSINESS_TYPE_LOCATION",
          collectedFields: {},
        },
      });
    }

    console.log(`📍 [ONBOARDING] Current state: ${state.currentState}`);

    // Check if already complete
    if (state.currentState === "COMPLETE") {
      console.log("✅ [ONBOARDING] Onboarding already complete — ignoring message");
      return { reply: "" };
    }

    // 3. INVOKE OPENAI (Zero history, temp=0)
    const context: OnboardingContext = {
      mode: "ONBOARDING",
      state: state.currentState as OnboardingStateValue,
      collected_fields: (state.collectedFields as Record<string, any>) || {},
      user_input: userInput,
    };

    const extractionResponse = await extractWithOpenAI(context);

    // 4. VALIDATE RESPONSE SCHEMA
    if (!extractionResponse.action || !extractionResponse.reply) {
      throw new Error("Invalid extraction response: missing required fields");
    }

    // 5. ENFORCE REPLY WHITELIST (HARD - REPLACE)
    const validatedReply = enforceReplyWhitelist(
      state.currentState as OnboardingStateValue,
      extractionResponse.action,
      extractionResponse.reply
    );

    // 6. NORMALIZE EXTRACTED FIELDS (Server-side)
    const normalizedFields = normalizeExtractedFields(
      state.currentState as OnboardingStateValue,
      extractionResponse.extracted
    );

    // 7. UPDATE STATE ATOMICALLY
    if (extractionResponse.action === "ACCEPT" || extractionResponse.action === "COMPLETE") {
      const nextState = extractionResponse.action === "COMPLETE" ? "COMPLETE" : extractionResponse.next_state;

      if (!nextState) {
        throw new Error("Invalid state transition: next_state is null for ACCEPT action");
      }

      console.log(`📍 [ONBOARDING] State transition: ${state.currentState} → ${nextState}`);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // PAYMENT GATE: Check trial eligibility and payment (PHASE 2A)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      if (state.currentState === "S5_CONFIRM_LIVE" && nextState === "S6_PHONE_TYPE") {
        console.log("💳 [PAYMENT_GATE] Checking trial eligibility and payment status");

        // ═══════════════════════════════════════════════════════════════════════
        // GATE 1: TRIAL ELIGIBILITY CHECK (REMOVED - Field doesn't exist in DB)
        // TODO: Re-implement trial tracking via separate table if needed
        // ═══════════════════════════════════════════════════════════════════════

        console.log("✅ [PAYMENT_GATE] Trial eligibility check (currently disabled)");

        // ═══════════════════════════════════════════════════════════════════════
        // GATE 2: PAYMENT STATUS CHECK
        // ═══════════════════════════════════════════════════════════════════════
        if (!client.billing || !isPaymentValid(client.billing.status)) {
          console.log("❌ [PAYMENT_GATE] Payment not active - showing trial signup");

          // Update lastMessageSid for idempotency, but DO NOT advance state
          await prisma.onboardingState.update({
            where: { id: state.id },
            data: {
              lastMessageSid: messageSid,
            },
          });

          const paymentMessage = getPaymentActivationMessage();

          console.log("💳 [PAYMENT_GATE] Sending payment message");
          console.log("PAYMENT_REQUIRED", {
            clientId: client.id,
            ownerPhone: client.phoneNumber,
            timestamp: new Date().toISOString(),
          });

          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("⚠️  [ONBOARDING] BLOCKED BY PAYMENT GATE");
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

          return { reply: paymentMessage };
        }

        console.log("✅ [PAYMENT_GATE] Payment active - allocating Twilio number");

        // Allocate Twilio number from pool
        const allocationResult = await allocateTwilioNumber(client.id);

        if (!allocationResult.success) {
          console.error("❌ [PAYMENT_GATE] Number allocation failed:", allocationResult.reason);

          // Update lastMessageSid for idempotency, but DO NOT advance state
          await prisma.onboardingState.update({
            where: { id: state.id },
            data: {
              lastMessageSid: messageSid,
            },
          });

          let errorMessage: string;

          if (allocationResult.reason === "POOL_EMPTY") {
            errorMessage = `We're currently at capacity.

Your payment is confirmed, and you're on our priority list.

We'll text you within 24 hours when your JobRun number is ready.`;

            console.log("POOL_EMPTY_DURING_ONBOARDING", {
              clientId: client.id,
              ownerPhone: client.phoneNumber,
              timestamp: new Date().toISOString(),
            });
          } else {
            errorMessage = `There was an issue assigning your JobRun number.

Don't worry - your payment is safe.

Reply READY to try again, or we'll reach out shortly.`;
          }

          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("⚠️  [ONBOARDING] BLOCKED BY ALLOCATION FAILURE");
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

          return { reply: errorMessage };
        }

        console.log("✅ [PAYMENT_GATE] Number allocated:", allocationResult.phoneE164);
        console.log("NUMBER_ALLOCATED", {
          clientId: client.id,
          phoneE164: allocationResult.phoneE164,
          ownerPhone: client.phoneNumber,
          timestamp: new Date().toISOString(),
        });

        // Refresh client to get updated twilioNumber
        const updatedClient = await prisma.client.findUnique({
          where: { id: client.id },
        });

        if (updatedClient) {
          // Update the client object reference for use in forwarding instructions later
          Object.assign(client, updatedClient);
        }
      }

      // Special handling for S6_PHONE_TYPE: Store phoneType in dedicated field
      const updateData: any = {
        currentState: nextState as OnboardingStateValue,
        collectedFields: {
          ...(state.collectedFields as Record<string, any>),
          ...normalizedFields,
        },
        lastMessageSid: messageSid,
        completedAt: extractionResponse.action === "COMPLETE" ? new Date() : null,
      };

      if (state.currentState === "S6_PHONE_TYPE" && normalizedFields.phone_type) {
        updateData.phoneType = normalizedFields.phone_type;
        console.log(`📱 [ONBOARDING] Storing phone type: ${normalizedFields.phone_type}`);
      }

      await prisma.onboardingState.update({
        where: { id: state.id },
        data: updateData,
      });

      console.log(`✅ [ONBOARDING] State updated successfully`);

      // SPECIAL CASE: When transitioning from S6_PHONE_TYPE to S7_FWD_SENT,
      // replace the reply with forwarding instructions
      if (state.currentState === "S6_PHONE_TYPE" && nextState === "S7_FWD_SENT" && normalizedFields.phone_type) {
        // CRITICAL: Must have assigned Twilio number before sending forwarding instructions
        if (!client.twilioNumber) {
          console.error("❌ [ONBOARDING] CRITICAL: Twilio number missing at forwarding step");
          console.error("ONBOARDING_BLOCKED_NO_TWILIO_NUMBER", {
            clientId: client.id,
            ownerPhone: client.phoneNumber,
            currentState: state.currentState,
            nextState,
            timestamp: new Date().toISOString(),
          });

          // Rollback state transition - stay at S6_PHONE_TYPE
          await prisma.onboardingState.update({
            where: { id: state.id },
            data: {
              currentState: "S6_PHONE_TYPE",
              lastMessageSid: messageSid,
            },
          });

          const retryMessage = `We're assigning your JobRun number now.

This usually takes a moment.

Reply READY in 1 minute to continue.`;

          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("⚠️  [ONBOARDING] BLOCKED - NO TWILIO NUMBER");
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

          return { reply: retryMessage };
        }

        // Number exists - send forwarding instructions
        const forwardingInstructions = generateForwardingInstructions(
          normalizedFields.phone_type,
          client.twilioNumber
        );

        console.log("📲 [ONBOARDING] Sending forwarding instructions");
        console.log(`   Client Twilio Number: ${client.twilioNumber}`);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✅ [ONBOARDING] HANDLER COMPLETE");
        console.log(`   Reply: "${forwardingInstructions}"`);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        return { reply: forwardingInstructions };
      }
    } else if (extractionResponse.action === "REJECT") {
      // Update lastMessageSid for idempotency, but don't advance state
      await prisma.onboardingState.update({
        where: { id: state.id },
        data: {
          lastMessageSid: messageSid,
        },
      });

      console.log(`⚠️ [ONBOARDING] Input rejected — state unchanged`);
    } else if (extractionResponse.action === "ERROR") {
      // Update lastMessageSid for idempotency
      await prisma.onboardingState.update({
        where: { id: state.id },
        data: {
          lastMessageSid: messageSid,
        },
      });

      console.error(`❌ [ONBOARDING] LLM returned ERROR`);
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ [ONBOARDING] HANDLER COMPLETE");
    console.log(`   Reply: "${validatedReply}"`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return { reply: validatedReply };
  } catch (error) {
    console.error("❌ [ONBOARDING] Handler error:", error);

    // Return fallback error message
    return {
      reply: "System error. Please try again.",
    };
  }
}
