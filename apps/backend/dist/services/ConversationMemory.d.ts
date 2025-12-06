/**
 * ConversationMemory - Track Conversation State
 * PHASE 10: Added loop detection and 24-hour auto-reset
 * Saves:
 * - Last proposed slot
 * - Extracted customer preferences
 * - Previous questions asked
 * - Conversation context
 * - Last interaction timestamp
 * - Recent messages for loop detection
 */
export interface ConversationState {
    conversationId: string;
    lastProposedSlot?: Date;
    preferredDate?: Date;
    preferredTimeWindow?: string;
    customerName?: string;
    serviceType?: string;
    urgency?: 'low' | 'medium' | 'high';
    previousQuestions: string[];
    declinedSlots: Date[];
    createdAt: Date;
    updatedAt: Date;
    lastInteraction: number;
    recentMessages: string[];
    loopCount: number;
    declineCount: number;
    contradictionCount: number;
    allMessages: Array<{
        text: string;
        sender: 'customer' | 'ai' | 'human';
        timestamp: Date;
    }>;
    silenced: boolean;
}
export declare class ConversationMemory {
    private static memory;
    private static readonly MAX_AGE_MS;
    private static readonly RECENT_MESSAGE_LIMIT;
    /**
     * Get conversation state
     */
    static get(conversationId: string): ConversationState | null;
    /**
     * Initialize new conversation
     */
    static init(conversationId: string): ConversationState;
    /**
     * Get or create conversation state
     * PHASE 10: Auto-reset if 24 hours elapsed
     */
    static getOrCreate(conversationId: string): ConversationState;
    /**
     * PHASE 10: Touch conversation (update last interaction timestamp)
     */
    static touch(conversationId: string): void;
    /**
     * PHASE 10: Check if memory needs reset (24 hours elapsed)
     */
    static needsReset(conversationId: string): boolean;
    /**
     * PHASE 10: Reset conversation state (called when 24h expired)
     */
    static reset(conversationId: string): ConversationState;
    /**
     * Update conversation state
     */
    static update(conversationId: string, updates: Partial<ConversationState>): ConversationState;
    /**
     * Record a proposed slot
     */
    static proposeSlot(conversationId: string, slot: Date): ConversationState;
    /**
     * Record a declined slot
     */
    static declineSlot(conversationId: string, slot: Date): ConversationState;
    /**
     * Record a question asked
     */
    static askQuestion(conversationId: string, question: string): ConversationState;
    /**
     * Set customer preferences
     */
    static setPreferences(conversationId: string, preferences: {
        preferredDate?: Date;
        preferredTimeWindow?: string;
        customerName?: string;
        serviceType?: string;
        urgency?: 'low' | 'medium' | 'high';
    }): ConversationState;
    /**
     * PHASE 10: Record message for loop detection
     */
    static recordMessage(conversationId: string, message: string): void;
    /**
     * PHASE 10: Detect conversation loop
     * Returns true if user is stuck in a loop
     */
    static detectLoop(conversationId: string, message: string): boolean;
    /**
     * PHASE 10: Check if hard loop reset needed (4+ ambiguous in a row)
     */
    static needsHardReset(conversationId: string): boolean;
    /**
     * PHASE 10: Reset loop counter
     */
    static resetLoopCount(conversationId: string): void;
    /**
     * Clear conversation state
     */
    static clear(conversationId: string): void;
    /**
     * Check if we've already asked a specific question
     */
    static hasAskedQuestion(conversationId: string, questionType: string): boolean;
    /**
     * Get declined slot count
     */
    static getDeclinedSlotCount(conversationId: string): number;
    /**
     * Clean up old conversations (older than 24 hours)
     */
    static cleanup(): void;
    /**
     * Track decline count
     */
    static trackDecline(conversationId: string): void;
    /**
     * Get decline count
     */
    static getDeclineCount(conversationId: string): number;
    /**
     * Track ambiguous reply
     */
    static trackAmbiguousReply(conversationId: string): void;
    /**
     * Track contradiction
     */
    static trackContradiction(conversationId: string): void;
    /**
     * Get contradiction count
     */
    static getContradictionCount(conversationId: string): number;
    /**
     * Get loop count
     */
    static getLoopCount(conversationId: string): number;
    /**
     * Add message to conversation history
     */
    static addMessage(conversationId: string, text: string, sender: 'customer' | 'ai' | 'human'): void;
    /**
     * Get last N messages
     */
    static getLastNMessages(conversationId: string, count?: number): string[];
    /**
     * Get urgency score (1-10)
     */
    static getUrgencyScore(conversationId: string): number;
    /**
     * Check if customer is VIP
     */
    static isVIPCustomer(conversationId: string): boolean;
    /**
     * Mark conversation as silenced (AI won't respond)
     */
    static markSilencedForHandover(conversationId: string): void;
    /**
     * Un-silence conversation (re-enable AI)
     */
    static unsilence(conversationId: string): void;
    /**
     * Check if conversation is silenced
     */
    static isSilenced(conversationId: string): boolean;
    /**
     * Get conversation preferences
     */
    static getPreferences(conversationId: string): Partial<ConversationState>;
}
//# sourceMappingURL=ConversationMemory.d.ts.map