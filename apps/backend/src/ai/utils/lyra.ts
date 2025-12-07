import { LLMClient } from "../../llm/LLMClient";
import { ClientSettings, Message } from "@prisma/client";
import { NextAction } from "./rune";
import { IntentType } from "./dial";
import { ExtractedEntities } from "./flow";

export interface GenerateReplyParams {
  clientSettings: ClientSettings | null;
  action: NextAction;
  intent: IntentType;
  entities: ExtractedEntities;
  recentMessages: Message[];
  businessName?: string;
}

function getAiTone(clientSettings: ClientSettings | null): string {
  if (!clientSettings?.metadata || typeof clientSettings.metadata !== "object") {
    return "friendly and professional";
  }

  const metadata = clientSettings.metadata as Record<string, unknown>;
  return (metadata.aiTone as string) || "friendly and professional";
}

function getBookingUrl(clientSettings: ClientSettings | null): string | null {
  if (!clientSettings?.metadata || typeof clientSettings.metadata !== "object") {
    return null;
  }

  const metadata = clientSettings.metadata as Record<string, unknown>;
  return (metadata.bookingUrl as string) || null;
}

function buildSystemPrompt(params: GenerateReplyParams): string {
  const { clientSettings, businessName } = params;
  const tone = getAiTone(clientSettings);
  const name = businessName || clientSettings?.businessName || "our business";

  return `You are an AI assistant for ${name}, a home services business.

Your personality and tone: ${tone}

Your job is to communicate with customers via SMS (text message).

Rules:
- Keep responses SHORT and conversational (SMS should be 1-3 sentences max)
- Be helpful and friendly
- Ask one question at a time
- Use natural, human language (no corporate jargon)
- Never use emojis or special characters
- Focus on helping the customer book or describe their needs
- If you have a booking link to share, present it naturally

You are responding to a customer text message. Generate a single SMS reply.`;
}

function buildUserPrompt(params: GenerateReplyParams): string {
  const { action, intent, entities, recentMessages } = params;
  const bookingUrl = getBookingUrl(params.clientSettings);

  const conversationHistory = recentMessages
    .slice(-5)
    .map((msg) => `${msg.direction}: ${msg.body}`)
    .join("\n");

  let actionGuidance = "";

  if (action === "ASK_QUESTION") {
    if (intent === "GREETING") {
      actionGuidance = "Warmly greet the customer and ask how you can help them today.";
    } else if (intent === "JOB_DESCRIPTION") {
      actionGuidance = "Ask a clarifying question about their job to gather more details (e.g., location, timing, specifics).";
    } else if (intent === "QUESTION") {
      actionGuidance = "Answer their question helpfully and briefly. If you don't have enough info, ask for clarification.";
    } else {
      actionGuidance = "Ask a helpful follow-up question to better understand their needs.";
    }
  } else if (action === "SEND_BOOKING_LINK") {
    if (bookingUrl) {
      actionGuidance = `Send them the booking link naturally. The URL is: ${bookingUrl}. Introduce it with a short sentence like "You can book a time here: [URL]"`;
    } else {
      actionGuidance = "Let them know someone will reach out shortly to schedule with them.";
    }
  } else if (action === "ACK_ONLY") {
    if (intent === "CLOSING") {
      actionGuidance = "Say a friendly goodbye or thank you.";
    } else {
      actionGuidance = "Acknowledge their message briefly and positively.";
    }
  }

  const entityContext = Object.keys(entities).length > 0
    ? `\nExtracted info: ${JSON.stringify(entities)}`
    : "";

  return `Recent conversation:
${conversationHistory || "(No previous messages)"}

Current intent: ${intent}
Your task: ${actionGuidance}${entityContext}

Generate a single SMS reply (short, natural, conversational):`;
}

export async function generateReply(
  params: GenerateReplyParams
): Promise<string> {
  const { action } = params;

  if (action === "NO_REPLY") {
    return "";
  }

  const systemPrompt = buildSystemPrompt(params);
  const userPrompt = buildUserPrompt(params);

  const llm = new LLMClient();
  const response = await llm.generate({
    model: "gpt-4o",
    systemPrompt,
    userPrompt,
    temperature: 0.8,
    maxTokens: 200,
  });

  let reply = response.content.trim();

  reply = reply.replace(/^["']|["']$/g, "");

  if (reply.length > 1600) {
    reply = reply.substring(0, 1597) + "...";
  }

  return reply;
}
