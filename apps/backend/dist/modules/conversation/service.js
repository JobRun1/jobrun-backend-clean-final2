"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOrCreateConversation = findOrCreateConversation;
exports.addMessage = addMessage;
exports.getConversationWithMessages = getConversationWithMessages;
exports.getCustomerConversations = getCustomerConversations;
exports.getClientConversations = getClientConversations;
const db_1 = require("../../db");
const logger_1 = require("../../utils/logger");
/**
 * Find or create a conversation for a customer
 */
async function findOrCreateConversation(clientId, customerId) {
    try {
        // Find the most recent conversation for this customer
        let conversation = await db_1.prisma.conversation.findFirst({
            where: {
                clientId,
                customerId,
            },
            orderBy: { updatedAt: 'desc' },
        });
        if (conversation) {
            logger_1.logger.debug('Found existing conversation', { conversationId: conversation.id });
            return conversation;
        }
        // Create new conversation
        conversation = await db_1.prisma.conversation.create({
            data: {
                clientId,
                customerId,
            },
        });
        logger_1.logger.info('Created new conversation', {
            conversationId: conversation.id,
            customerId,
            clientId,
        });
        return conversation;
    }
    catch (error) {
        logger_1.logger.error('Error in findOrCreateConversation', error);
        throw error;
    }
}
/**
 * Add a message to a conversation
 */
async function addMessage(params) {
    try {
        const message = await db_1.prisma.message.create({
            data: {
                conversationId: params.conversationId,
                clientId: params.clientId,
                customerId: params.customerId,
                direction: params.direction,
                type: params.type,
                body: params.body,
                twilioSid: params.twilioSid,
                metadata: params.metadata || undefined,
            },
        });
        // Update conversation's updatedAt timestamp
        await db_1.prisma.conversation.update({
            where: { id: params.conversationId },
            data: { updatedAt: new Date() },
        });
        logger_1.logger.info('Added message to conversation', {
            messageId: message.id,
            conversationId: params.conversationId,
            direction: params.direction,
            type: params.type,
        });
        return message;
    }
    catch (error) {
        logger_1.logger.error('Error adding message', error);
        throw error;
    }
}
/**
 * Get conversation with all messages
 */
async function getConversationWithMessages(conversationId) {
    return db_1.prisma.conversation.findUnique({
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
async function getCustomerConversations(customerId) {
    return db_1.prisma.conversation.findMany({
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
async function getClientConversations(clientId) {
    return db_1.prisma.conversation.findMany({
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
//# sourceMappingURL=service.js.map