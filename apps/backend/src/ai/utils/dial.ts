import { LLMClient } from "../../llm/LLMClient";
import { Message } from "@prisma/client";

export type IntentType =
  | "GREETING"
  | "QUESTION"
  | "BOOKING_REQUEST"
  | "JOB_DESCRIPTION"
  | "URGENT_PROBLEM"
  | "FOLLOW_UP"
  | "CLOSING"
  | "OTHER";

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

- GREETING: Initial hello, hi, or introduction messages
- QUESTION: General questions about services, pricing, availability
- BOOKING_REQUEST: Clear request to schedule or book an appointment
- JOB_DESCRIPTION: Describing a specific job or problem that needs fixing
- URGENT_PROBLEM: Emergency or time-sensitive issue
- FOLLOW_UP: Following up on a previous conversation or booking
- CLOSING: Thank you, goodbye, or conversation ending
- OTHER: Anything that doesn't fit the above

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
      intent: "OTHER",
      confidence: 0.3,
    };
  }
}
