/**
 * MessageTemplates - AI Response Templates
 * Tone: Professional, Polite, Efficient
 * PHASE 10: Hard-locked consistency structure
 */
export declare class MessageTemplates {
    /**
     * HARD-LOCKED: Offer a specific time slot
     * EXACT structure enforced
     */
    static offerSlot(slot: Date): string;
    /**
     * HARD-LOCKED: Offer next earliest slot after declined
     * EXACT structure enforced
     */
    static nextSlot(slot: Date): string;
    /**
     * HARD-LOCKED: Confirm booking
     * EXACT structure enforced
     */
    static confirmBooking(slot: Date, customerName?: string): string;
    /**
     * HARD-LOCKED: Fallback for errors or unclear situations
     * EXACT structure enforced
     */
    static fallback(): string;
    /**
     * PHASE 10: DIRECT & CONCISE clarification - date missing
     */
    static clarifyDate(): string;
    /**
     * PHASE 10: DIRECT & CONCISE clarification - time missing
     */
    static clarifyTime(): string;
    /**
     * PHASE 10: DIRECT & CONCISE clarification - time window ambiguous
     */
    static clarifyTimeWindow(): string;
    /**
     * PHASE 10: DIRECT & CONCISE clarification - general
     */
    static clarifyGeneral(): string;
    /**
     * PHASE 10: Loop detection - soft reset
     */
    static loopReset(): string;
    /**
     * PHASE 10: Loop detection - hard reset
     */
    static loopHardReset(): string;
    /**
     * PHASE 10: Memory reset (24-hour timeout)
     */
    static memoryReset(): string;
    /**
     * PHASE 11A: Handover escalated to human
     */
    static handoverEscalated(): string;
    /**
     * PHASE 11A: AI silenced during active handover
     */
    static handoverSilent(): string;
    /**
     * PHASE 11A: Handover closed, AI back online
     */
    static handoverClosed(): string;
    /**
     * Urgent slot offer
     */
    static urgentSlot(slot: Date): string;
    /**
     * Ask for preferred date (legacy - prefer clarifyDate)
     */
    static askDate(): string;
    /**
     * Ask for preferred time
     */
    static askTime(date: Date): string;
    /**
     * Ask for general preference (legacy - prefer clarifyGeneral)
     */
    static askPreference(): string;
    /**
     * Day is closed
     */
    static closedDay(requestedDate: Date, nextOpenDay: Date): string;
    /**
     * Day is fully booked
     */
    static fullyBooked(requestedDate: Date, nextAvailable: Date): string;
    /**
     * Message unclear - request clarification
     */
    static unclear(): string;
    /**
     * No availability found
     */
    static noAvailability(): string;
    /**
     * Format time in 12-hour format
     */
    private static formatTime;
    /**
     * Format date in human-readable format
     */
    private static formatDate;
    /**
     * Check if date is today
     */
    private static isToday;
}
//# sourceMappingURL=MessageTemplates.d.ts.map