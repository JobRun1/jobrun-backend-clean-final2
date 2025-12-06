/**
 * HandoverDetectionEngine - Detects when conversation should escalate to human
 * PHASE 11A: Human Handover Mode
 *
 * Triggers escalation based on:
 * - Frustration markers
 * - Anger markers
 * - Confusion markers
 * - Safety flags
 * - Repeated declines
 * - Loop detection
 * - Explicit human requests
 * - VIP customer flag
 * - Complex requests
 */
export interface HandoverDetectionResult {
    shouldEscalate: boolean;
    reason: string | null;
    urgencyScore: number;
    triggers: string[];
}
export declare class HandoverDetectionEngine {
    /**
     * Main detection method - check if conversation should escalate to human
     */
    static detectHandover(message: string, conversationId: string, isVIP?: boolean): HandoverDetectionResult;
    /**
     * Detect explicit request for human
     */
    private static isExplicitHumanRequest;
    /**
     * Detect frustration markers
     */
    private static isFrustrated;
    /**
     * Detect anger markers
     */
    private static isAngry;
    /**
     * Detect confusion markers
     */
    private static isConfused;
    /**
     * Detect complex requests beyond AI capability
     */
    private static isComplexRequest;
    /**
     * Check if message indicates customer wants to cancel/leave
     */
    static isAbandoning(normalized: string): boolean;
    /**
     * Get urgency level description
     */
    static getUrgencyLevel(score: number): string;
}
//# sourceMappingURL=HandoverDetectionEngine.d.ts.map