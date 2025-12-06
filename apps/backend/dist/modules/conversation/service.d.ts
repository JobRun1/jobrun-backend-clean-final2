import type { Conversation, Message, MessageDirection, MessageType } from '@prisma/client';
/**
 * Find or create a conversation for a customer
 */
export declare function findOrCreateConversation(clientId: string, customerId: string): Promise<Conversation>;
/**
 * Add a message to a conversation
 */
export declare function addMessage(params: {
    conversationId: string;
    clientId: string;
    customerId?: string;
    direction: MessageDirection;
    type: MessageType;
    body: string;
    twilioSid?: string;
    metadata?: any;
}): Promise<Message>;
/**
 * Get conversation with all messages
 */
export declare function getConversationWithMessages(conversationId: string): Promise<(Conversation & {
    messages: Message[];
}) | null>;
/**
 * Get all conversations for a customer
 */
export declare function getCustomerConversations(customerId: string): Promise<(Conversation & {
    messages: Message[];
})[]>;
/**
 * Get all conversations for a client
 */
export declare function getClientConversations(clientId: string): Promise<(Conversation & {
    messages: Message[];
    customer: any;
})[]>;
//# sourceMappingURL=service.d.ts.map