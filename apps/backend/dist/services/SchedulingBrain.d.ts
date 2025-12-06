/**
 * SchedulingBrain - Core AI Scheduling Logic
 * PHASE 10: Integrated safety, truthfulness, and guardrails
 * Orchestrates all AI modules to handle booking conversations
 */
export interface SchedulingRequest {
    message: string;
    conversationId: string;
    clientId: string;
    defaultDurationMinutes?: number;
}
export interface SchedulingResponse {
    reply: string;
    proposedSlot: Date | null;
    shouldBook: boolean;
}
export declare class SchedulingBrain {
    /**
     * Main entry point - process incoming message and generate response
     * PHASE 10: Complete safety and truthfulness integration
     * PHASE 11A: Added handover detection and escalation
     */
    static process(request: SchedulingRequest): Promise<SchedulingResponse>;
    /**
     * PHASE 10: Check if date clarification is needed
     */
    private static needsDateClarification;
    /**
     * Handle urgent requests (ASAP, today, emergency)
     */
    private static handleUrgentRequest;
    /**
     * Handle date-only requests
     */
    private static handleDateOnly;
    /**
     * Handle time-only requests (morning, afternoon, etc.)
     */
    private static handleTimeOnly;
    /**
     * Handle date + time requests
     */
    private static handleDateAndTime;
    /**
     * Handle initial request with no specifics
     */
    private static handleInitialRequest;
    /**
     * Find next available slot after a given date/time
     */
    private static findNextSlot;
    /**
     * Check if message is a confirmation
     */
    private static isConfirmation;
    /**
     * Check if message is a decline/rejection
     */
    private static isDecline;
    /**
     * PHASE 11A: Trigger handover to human
     */
    private static triggerHandover;
}
//# sourceMappingURL=SchedulingBrain.d.ts.map