import { LLMClient } from "../../llm/LLMClient";
import { Message } from "@prisma/client";

export type IntentType = "NORMAL" | "URGENT" | "UNCLEAR" | "NON_LEAD";

export interface ClassifyIntentParams {
  text: string;
  context: Message[];
}

export interface IntentClassificationResult {
  intent: IntentType;
  confidence: number;
}

const SYSTEM_PROMPT = `You are an intent classification agent for a home services business SMS system.
Your job is to classify customer messages into one of these intents:

- NORMAL: Standard lead inquiry, job description, booking request, or general question about services. Customer is providing information about a job they need done.
- URGENT: Emergency situation requiring immediate attention. Includes keywords like "emergency", "ASAP", "urgent", "right now", "flooding", "no heating", "lockout", "gas leak", or any safety/property damage risk.
- UNCLEAR: Cannot determine what the customer wants. Message is too vague, incomplete, or confusing. Not enough information to understand the job or request.
- NON_LEAD: Spam, sales pitches, wrong number, abusive messages, or clearly irrelevant content that has nothing to do with home services.

Return a JSON object with:
{
  "intent": "INTENT_NAME",
  "confidence": 0.95
}

Confidence should be 0.0 to 1.0.`;

export async function classifyIntent(
  params: ClassifyIntentParams
): Promise<IntentClassificationResult> {
  const { text, context } = params;

  const conversationHistory = context
    .slice(-5)
    .map((msg) => `${msg.direction}: ${msg.body}`)
    .join("\n");

  const userPrompt = `Recent conversation:
${conversationHistory || "(No previous messages)"}

Latest message to classify:
"${text}"

Classify the intent of the latest message.`;

  const llm = new LLMClient();
  const response = await llm.generate({
    model: "gpt-4o-mini",
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.3,
    maxTokens: 150,
    jsonMode: true,
  });

  try {
    const parsed = JSON.parse(response.content);
    return {
      intent: parsed.intent as IntentType,
      confidence: parsed.confidence || 0.5,
    };
  } catch (err) {
    console.error("DIAL: Failed to parse intent response:", err);
    return {
      intent: "UNCLEAR",
      confidence: 0.3,
    };
  }
}
