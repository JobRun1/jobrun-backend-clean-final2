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
import { Customer, OnboardingState } from "@prisma/client";
import { LLMClient } from "../llm/LLMClient";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type OnboardingStateValue =
  | "S1_BUSINESS_TYPE_LOCATION"
  | "S2_BUSINESS_NAME"
  | "S3_OWNER_NAME"
  | "S4_NOTIFICATION_PREF"
  | "S5_CONFIRM_LIVE"
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
    COMPLETE: [
      "JobRun is now live.\n\nIf you miss a call, I'll handle the text conversation and send you the details here.",
    ],
    REJECT: ["Reply YES to activate JobRun."],
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
  • action MUST be COMPLETE

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
  • COMPLETE: "JobRun is now live.\\n\\nIf you miss a call, I'll handle the text conversation and send you the details here."
  • REJECT: "Reply YES to activate JobRun."

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

    return parsed;
  } catch (error) {
    console.error("❌ [OPENAI] Extraction failed:", error);

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

  console.log(`🔧 [NORMALIZE] Normalized fields:`, normalized);

  return normalized;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TWO-TIER IDEMPOTENCY CHECK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function checkIdempotency(
  customerId: string,
  messageSid: string
): Promise<boolean> {
  // TIER 1: Redis check (fast path) — NOT IMPLEMENTED YET
  // TODO: Add Redis check here when available

  // TIER 2: Database check (fallback)
  const state = await prisma.onboardingState.findUnique({
    where: { customerId },
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
  customer: Customer;
  userInput: string;
  messageSid: string;
}): Promise<{ reply: string }> {
  const { customer, userInput, messageSid } = params;

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔒 [ONBOARDING] HANDLER START");
  console.log(`   Customer: ${customer.phone}`);
  console.log(`   Input: "${userInput}"`);
  console.log(`   MessageSid: ${messageSid}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // 1. IDEMPOTENCY CHECK
    const alreadyProcessed = await checkIdempotency(customer.id, messageSid);
    if (alreadyProcessed) {
      console.log("⚠️ [ONBOARDING] Message already processed — returning 200 without reply");
      return { reply: "" }; // Return empty to prevent duplicate SMS
    }

    // 2. LOAD OR CREATE STATE
    let state = await prisma.onboardingState.findUnique({
      where: { customerId: customer.id },
    });

    if (!state) {
      console.log("📝 [ONBOARDING] Creating new onboarding state for customer");
      state = await prisma.onboardingState.create({
        data: {
          customerId: customer.id,
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

      await prisma.onboardingState.update({
        where: { id: state.id },
        data: {
          currentState: nextState as OnboardingStateValue,
          collectedFields: {
            ...(state.collectedFields as Record<string, any>),
            ...normalizedFields,
          },
          lastMessageSid: messageSid,
          completedAt: extractionResponse.action === "COMPLETE" ? new Date() : null,
        },
      });

      console.log(`✅ [ONBOARDING] State updated successfully`);
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
