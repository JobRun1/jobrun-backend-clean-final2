import { LLMClient } from "../../llm/LLMClient";
import { Message } from "@prisma/client";
import { IntentType } from "./dial";

export interface ExtractedEntities {
  jobType?: string;
  urgency?: string;
  location?: string;
  requestedTime?: string;
  customerName?: string;
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
- jobType: Type of service needed (e.g., "plumbing", "electrical", "HVAC", "boiler repair", etc.)
- urgency: Urgency description in plain language (e.g., "no heating", "water leak getting worse", "flooding", "lockout", "power out", "smoke/burning smell", "routine maintenance")
- location: Location information (address, city, area, or property description)
- requestedTime: When they want service (e.g., "tomorrow morning", "this afternoon", "next week", "ASAP")
- customerName: Customer's name if mentioned
- extraDetails: Any other important context (problem description, special requirements, access notes, etc.)

Return a JSON object like:
{
  "jobType": "boiler repair",
  "urgency": "no heating",
  "location": "123 Main St",
  "requestedTime": "tomorrow morning",
  "customerName": "John Smith",
  "extraDetails": "Boiler making strange noises before it stopped"
}

Only include fields that are explicitly mentioned or strongly implied. Omit fields if uncertain.`;

export async function extractEntities(
  params: ExtractEntitiesParams
): Promise<ExtractedEntities> {
  const { text, context, intent } = params;

  // Skip entity extraction for non-leads
  if (intent === "NON_LEAD") {
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
      urgency: parsed.urgency || undefined,
      location: parsed.location || undefined,
      requestedTime: parsed.requestedTime || undefined,
      customerName: parsed.customerName || undefined,
      extraDetails: parsed.extraDetails || undefined,
    };
  } catch (err) {
    console.error("FLOW: Failed to parse entity extraction response:", err);
    return {};
  }
}
