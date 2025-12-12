import { Message, MessageDirection, MessageType } from "@prisma/client";
import { addMessage } from "../../modules/conversation/service";

export interface LogAiEventParams {
  clientId: string;
  customerId?: string;
  conversationId?: string;
  direction: MessageDirection;
  type: MessageType;
  content: string;
  metadata?: Record<string, unknown>;
}

export async function logAiEvent(
  params: LogAiEventParams
): Promise<Message | null> {
  const {
    clientId,
    customerId,
    conversationId,
    direction,
    type,
    content,
    metadata,
  } = params;

  // Only create Message if we have conversationId and customerId
  // Otherwise just log to console without DB write
  if (!conversationId || !customerId) {
    console.log(`📝 AI Event (console-only): ${direction}/${type} - ${content}`);
    return null;
  }

  // Use conversation service to ensure foreign key constraints are met
  const message = await addMessage({
    conversationId,
    clientId,
    customerId,
    direction,
    type,
    body: content,
    metadata,
  });

  console.log(`📝 AI Event logged: ${direction}/${type} - ${message.id}`);

  return message;
}
