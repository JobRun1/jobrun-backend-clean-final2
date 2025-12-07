import { LLMClient } from "../../llm/LLMClient";
import { Message } from "@prisma/client";
import { IntentType } from "./dial";

export type UrgencyLevel = "LOW" | "MEDIUM" | "HIGH";

export interface ExtractedEntities {
  jobType?: string;
  location?: string;
  urgency?: UrgencyLevel;
  extraDetails?: string;
}

export interface ExtractEntitiesParams {
  text: string;
  context: Message[];
  intent: IntentType;
}

const SYSTEM_PROMPT = `You are an entity extraction agent for a home services business.
Your job is to extract structured information from customer messages about jobs and requests.

Extract the following fields when available:
- jobType: Type of service needed (e.g., "plumbing", "electrical", "HVAC", "roofing", etc.)
- location: Location information (address, city, area)
- urgency: How urgent (LOW, MEDIUM, HIGH)
  - HIGH: Emergency, immediate, ASAP, urgent problem
  - MEDIUM: Soon, this week, need it done quickly
  - LOW: No rush, scheduling for future, exploring options
- extraDetails: Any other important context (problem description, special requirements, etc.)

Return a JSON object like:
{
  "jobType": "plumbing",
  "location": "123 Main St",
  "urgency": "HIGH",
  "extraDetails": "Burst pipe in basement, water everywhere"
}

Only include fields that are explicitly mentioned or strongly implied. Omit fields if uncertain.`;

export async function extractEntities(
  params: ExtractEntitiesParams
): Promise<ExtractedEntities> {
  const { text, context, intent } = params;

  if (intent === "GREETING" || intent === "CLOSING") {
    return {};
  }

  const conversationHistory = context
    .slice(-5)
    .map((msg) => `${msg.direction}: ${msg.body}`)
    .join("\n");

  const userPrompt = `Recent conversation:
${conversationHistory || "(No previous messages)"}

Latest message:
"${text}"

Intent: ${intent}

Extract job-related entities from the message.`;

  const llm = new LLMClient();
  const response = await llm.generate({
    model: "gpt-4o-mini",
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.2,
    maxTokens: 300,
    jsonMode: true,
  });

  try {
    const parsed = JSON.parse(response.content);
    return {
      jobType: parsed.jobType || undefined,
      location: parsed.location || undefined,
      urgency: parsed.urgency || undefined,
      extraDetails: parsed.extraDetails || undefined,
    };
  } catch (err) {
    console.error("FLOW: Failed to parse entity extraction response:", err);
    return {};
  }
}
