/**
 * LYRA — Outbound Message Generator for JobRun
 *
 * Produces short, clear, friendly, professional SMS replies based on:
 * - The action chosen by RUNE
 * - Client configuration (business name, booking link)
 * - Extracted details from FLOW
 */

import { LLMClient } from "../../llm/LLMClient";
import { ClientSettings, Message } from "@prisma/client";
import { ExtractedEntities } from "./flow";

export type LyraAction =
  | "SEND_CLARIFY_QUESTION"
  | "SEND_BOOKING_LINK"
  | "SEND_BOOKING_AND_ALERT"
  | "SEND_POLITE_DECLINE";

export interface GenerateReplyParams {
  clientSettings: ClientSettings | null;
  action: LyraAction;
  entities: ExtractedEntities;
  recentMessages: Message[];
  businessName?: string;
}

interface LyraInput {
  action: LyraAction;
  flow: {
    job_type?: string;
    urgency?: string;
    location?: string;
    requested_time?: string;
    customer_name?: string;
    extra_notes?: string;
  };
  config: {
    business_name: string;
    booking_link?: string;
  };
}

interface LyraOutput {
  message: string;
}

function getBookingUrl(clientSettings: ClientSettings | null): string | null {
  if (!clientSettings?.metadata || typeof clientSettings.metadata !== "object") {
    return null;
  }

  const metadata = clientSettings.metadata as Record<string, unknown>;
  return (metadata.bookingUrl as string) || null;
}

const SYSTEM_PROMPT = `You are LYRA — the outbound message generator for JobRun.

Your job is to produce short, clear, friendly, professional SMS replies based on:
- The action chosen by RUNE
- The client configuration (business name, booking link, custom first SMS)
- The extracted details from FLOW

You MUST output STRICT JSON ONLY with NO additional text.

##############################################
POSSIBLE ACTIONS YOU MUST HANDLE
##############################################

1. SEND_CLARIFY_QUESTION
2. SEND_BOOKING_LINK
3. SEND_BOOKING_AND_ALERT
4. SEND_POLITE_DECLINE

##############################################
STRICT OUTPUT FORMAT
##############################################

Respond ONLY with:

{
  "message": ""
}

Rules for the "message" field:
- Maximum 2 sentences.
- Friendly but efficient.
- No emojis.
- No ellipses.
- No filler language.
- No disclaimers.
- No references to AI, systems, automation, or JobRun.
- Never mention RUNE, DIAL, FLOW, or any internal logic.
- Use the business name naturally when appropriate.
- If the booking link is provided, embed it as-is.
- Do not fabricate details not present in the input.

##############################################
ACTION RULES
##############################################

### 1. SEND_CLARIFY_QUESTION
Use when job details are unclear.
Message style:
- Ask for a brief, specific clarification.
- Tone: helpful + concise.

Examples:
"Thanks for your message. Could you tell me a little more about the issue so we can assist you properly?"
"Could you give a few more details about the problem so we know how to help?"

### 2. SEND_BOOKING_LINK
Use for normal jobs with clear details.
Message style:
- Acknowledge the job.
- Provide booking link.
- Encourage booking.

Examples:
"Thanks for getting in touch. You can book an appointment here: {booking_link}."
"We can help with that — please book a time that suits you here: {booking_link}."

### 3. SEND_BOOKING_AND_ALERT
Use for urgent or safety-related issues.
Message style:
- Acknowledge urgency.
- Provide booking link.
- Inform customer someone will review shortly.

Examples:
"Thanks for your message. This sounds urgent — please book here and we'll review it straight away: {booking_link}."
"That sounds time-sensitive. Use this link to book immediately and we'll prioritise it: {booking_link}."

### 4. SEND_POLITE_DECLINE
Used for spam, irrelevant messages, or services the client does not provide.
Message style:
- Polite.
- Short.
- Firm.
- No judgement.

Examples:
"Thanks for reaching out, but we aren't able to help with this request."
"Appreciate the message. This isn't something we can assist with."

##############################################
VARIABLE RULES
##############################################

- {business_name}: Use only when it feels natural.
- {booking_link}: Always include when RUNE chooses a booking action.
- If customer_name is provided, you may address them using their first name, but only if natural.
- Do not invent any variables not present in input.

##############################################
ABSOLUTE RULES
##############################################

- Always return JSON.
- Never write outside the JSON.
- Never show reasoning.
- Never output internal agent names or anything about decision logic.
- Never ask unnecessary questions.
- Keep everything clean, short, and professional.`;

function buildUserPrompt(input: LyraInput, recentMessages: Message[]): string {
  const conversationHistory = recentMessages
    .slice(-3)
    .map((msg) => `${msg.direction}: ${msg.body}`)
    .join("\n");

  return `Recent conversation:
${conversationHistory || "(No previous messages)"}

Input:
${JSON.stringify(input, null, 2)}

Generate the SMS reply following the rules for action: ${input.action}`;
}

export async function generateReply(
  params: GenerateReplyParams
): Promise<string> {
  const { action, entities, recentMessages, clientSettings, businessName } = params;

  const bookingUrl = getBookingUrl(clientSettings);
  const name = businessName || clientSettings?.businessName || "our business";

  // Build LYRA input
  const lyraInput: LyraInput = {
    action,
    flow: {
      job_type: entities.jobType,
      urgency: entities.urgency,
      location: entities.location,
      requested_time: entities.requestedTime,
      customer_name: entities.customerName,
      extra_notes: entities.extraDetails,
    },
    config: {
      business_name: name,
      booking_link: bookingUrl || undefined,
    },
  };

  const userPrompt = buildUserPrompt(lyraInput, recentMessages);

  const llm = new LLMClient();
  const response = await llm.generate({
    model: "gpt-4o",
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.7,
    maxTokens: 200,
    jsonMode: true,
  });

  try {
    const parsed: LyraOutput = JSON.parse(response.content);
    let message = parsed.message.trim();

    // Ensure SMS length limit
    if (message.length > 1600) {
      message = message.substring(0, 1600);
    }

    return message;
  } catch (err) {
    console.error("LYRA: Failed to parse JSON response:", err);
    // Fallback message
    return "Thanks for your message. Someone from the team will get back to you shortly.";
  }
}
