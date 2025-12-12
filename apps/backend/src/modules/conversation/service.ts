import { prisma } from '../../db';
import { logger } from '../../utils/logger';
import type { Conversation, Message, MessageDirection, MessageType } from '@prisma/client';

/**
 * Find or create a conversation for a customer
 */
export async function findOrCreateConversation(
  clientId: string,
  customerId: string
): Promise<Conversation> {
  try {
    if (!customerId) {
      throw new Error('customerId is required for conversation');
    }

    const customerExists = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });

    if (!customerExists) {
      throw new Error(`Customer ${customerId} does not exist`);
    }

    // Find the most recent conversation for this customer
    let conversation = await prisma.conversation.findFirst({
      where: {
        clientId,
        customerId,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (conversation) {
      logger.debug('Found existing conversation', { conversationId: conversation.id });
      return conversation;
    }

    // Create new conversation
    conversation = await prisma.conversation.create({
      data: {
        clientId,
        customerId,
      },
    });

    logger.info('Created new conversation', {
      conversationId: conversation.id,
      customerId,
      clientId,
    });

    return conversation;
  } catch (error) {
    logger.error('Error in findOrCreateConversation', error as Error);
    throw error;
  }
}

/**
 * Add a message to a conversation
 * INVARIANTS ENFORCED:
 * - Conversation must exist
 * - Conversation must belong to the specified client
 * - If customerId provided, conversation must belong to that customer
 */
export async function addMessage(params: {
  conversationId: string;
  clientId: string;
  customerId?: string;
  direction: MessageDirection;
  type: MessageType;
  body: string;
  twilioSid?: string;
  metadata?: any;
}): Promise<Message> {
  try {
    // CRITICAL: Verify conversation exists and matches ALL provided IDs
    const conversation = await prisma.conversation.findUnique({
      where: { id: params.conversationId },
      select: { id: true, clientId: true, customerId: true },
    });

    if (!conversation) {
      throw new Error(`Conversation ${params.conversationId} does not exist`);
    }

    if (conversation.clientId !== params.clientId) {
      throw new Error(
        `Conversation ${params.conversationId} belongs to client ${conversation.clientId}, not ${params.clientId}`
      );
    }

    if (params.customerId && conversation.customerId !== params.customerId) {
      throw new Error(
        `Conversation ${params.conversationId} belongs to customer ${conversation.customerId}, not ${params.customerId}`
      );
    }

    // Use conversation's customerId as the source of truth
    const messageCustomerId = params.customerId || conversation.customerId;

    const message = await prisma.message.create({
      data: {
        conversationId: params.conversationId,
        clientId: params.clientId,
        customerId: messageCustomerId,
        direction: params.direction,
        type: params.type,
        body: params.body,
        twilioSid: params.twilioSid,
        metadata: params.metadata || undefined,
      },
    });

    // Update conversation's updatedAt timestamp
    await prisma.conversation.update({
      where: { id: params.conversationId },
      data: { updatedAt: new Date() },
    });

    logger.info('Added message to conversation', {
      messageId: message.id,
      conversationId: params.conversationId,
      customerId: messageCustomerId,
      direction: params.direction,
      type: params.type,
    });

    return message;
  } catch (error) {
    logger.error('Error adding message', error as Error);
    throw error;
  }
}

/**
 * Get conversation with all messages
 */
export async function getConversationWithMessages(
  conversationId: string
): Promise<(Conversation & { messages: Message[] }) | null> {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

/**
 * Get all conversations for a customer
 */
export async function getCustomerConversations(
  customerId: string
): Promise<(Conversation & { messages: Message[] })[]> {
  return prisma.conversation.findMany({
    where: { customerId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

/**
 * Get all conversations for a client
 */
export async function getClientConversations(
  clientId: string
): Promise<(Conversation & { messages: Message[]; customer: any })[]> {
  return prisma.conversation.findMany({
    where: { clientId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
      customer: true,
    },
    orderBy: { updatedAt: 'desc' },
  });
}
