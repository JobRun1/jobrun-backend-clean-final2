import { PrismaClient, Message, MessageDirection, MessageType } from "@prisma/client";

const prisma = new PrismaClient();

export interface LogAiEventParams {
  clientId: string;
  leadId?: string;
  customerId?: string;
  conversationId?: string;
  direction: MessageDirection;
  type: MessageType;
  content: string;
  metadata?: Record<string, unknown>;
}

export async function logAiEvent(
  params: LogAiEventParams
): Promise<Message> {
  const {
    clientId,
    leadId,
    customerId,
    conversationId,
    direction,
    type,
    content,
    metadata,
  } = params;

  const message = await prisma.message.create({
    data: {
      clientId,
      customerId: customerId || null,
      conversationId: conversationId || null,
      direction,
      type,
      body: content,
      metadata: metadata ? (metadata as any) : null,
    },
  });

  console.log(`📝 AI Event logged: ${direction}/${type} - ${message.id}`);

  return message;
}
