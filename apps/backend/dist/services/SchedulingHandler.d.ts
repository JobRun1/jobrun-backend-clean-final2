/**
 * SchedulingHandler - API Handler for AI Scheduling
 * PHASE 10: Added safety wrapper and admin logging
 * Connects Twilio inbound messages → AI Brain → outbound response
 * Creates bookings when confirmed
 */
export interface HandleSchedulingRequest {
    message: string;
    conversationId: string;
    clientId: string;
    customerPhone?: string;
    customerName?: string;
}
export interface HandleSchedulingResponse {
    reply: string;
    proposedSlot: Date | null;
    bookingCreated: boolean;
    bookingId?: string;
}
export declare class SchedulingHandler {
    /**
     * Main handler - process message and optionally create booking
     * PHASE 10: Added safety wrapper and admin logging
     */
    static handle(request: HandleSchedulingRequest): Promise<HandleSchedulingResponse>;
    /**
     * Create a confirmed booking
     */
    private static createBooking;
    /**
     * Get conversation history (for future enhancement)
     */
    static getConversationHistory(conversationId: string): Promise<any[]>;
    /**
     * Save conversation message (for future enhancement)
     */
    static saveMessage(params: {
        conversationId: string;
        message: string;
        sender: 'customer' | 'ai';
        timestamp: Date;
    }): Promise<void>;
}
//# sourceMappingURL=SchedulingHandler.d.ts.map