/**
 * UrgencyClassifier - Detect Urgent Booking Requests
 * Keywords: urgent, asap, emergency, today, soon
 */
export declare class UrgencyClassifier {
    private static readonly URGENT_KEYWORDS;
    private static readonly HIGH_PRIORITY_PHRASES;
    /**
     * Classify if a message indicates urgency
     */
    static isUrgent(text: string): boolean;
    /**
     * Extract urgency level (for future use)
     */
    static getUrgencyLevel(text: string): 'none' | 'low' | 'medium' | 'high';
}
//# sourceMappingURL=UrgencyClassifier.d.ts.map