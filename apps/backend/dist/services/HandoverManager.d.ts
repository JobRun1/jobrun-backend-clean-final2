/**
 * HandoverManager - Manages human handover state
 * PHASE 11A: Human Handover Mode
 *
 * Manages:
 * - Starting handover (create HandoverState record)
 * - Ending handover (mark inactive)
 * - Checking handover status
 * - Notification throttling
 */
export interface HandoverState {
    id: string;
    conversationId: string;
    clientId: string;
    active: boolean;
    reason: string | null;
    urgencyScore: number;
    triggers: string[];
    lastNotificationAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface StartHandoverParams {
    conversationId: string;
    clientId: string;
    reason: string;
    urgencyScore: number;
    triggers: string[];
}
export declare class HandoverManager {
    /**
     * Start a handover - create HandoverState record
     */
    static startHandover(params: StartHandoverParams): Promise<HandoverState>;
    /**
     * End a handover - mark inactive
     */
    static endHandover(conversationId: string): Promise<void>;
    /**
     * Check if conversation is in active handover
     */
    static isInHandover(conversationId: string): Promise<boolean>;
    /**
     * Get handover state for conversation
     */
    static getHandoverState(conversationId: string): Promise<HandoverState | null>;
    /**
     * Check if notification should be sent (throttle to prevent spam)
     * Returns true if notification should be sent
     */
    static shouldNotify(conversationId: string): Promise<boolean>;
    /**
     * Mark that notification was sent
     */
    static markNotified(conversationId: string): Promise<void>;
    /**
     * Get all active handovers for a client
     */
    static getActiveHandovers(clientId: string): Promise<HandoverState[]>;
    /**
     * Get handover count for client
     */
    static getActiveHandoverCount(clientId: string): Promise<number>;
    /**
     * Get all handovers (active + inactive) for conversation
     */
    static getConversationHistory(conversationId: string): Promise<HandoverState[]>;
    /**
     * Close all active handovers for client (emergency use)
     */
    static closeAllHandovers(clientId: string): Promise<number>;
}
//# sourceMappingURL=HandoverManager.d.ts.map