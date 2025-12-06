/**
 * TimeParser - Natural Language Time Interpretation
 * Parses text like "around 3", "after 4", "evening", "lunchtime"
 */
export interface TimeWindow {
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
}
export declare class TimeParser {
    /**
     * Parse natural language time expressions into time windows
     */
    static parse(text: string): TimeWindow | null;
    /**
     * Helper to check if text contains any of the keywords
     */
    private static matches;
    /**
     * Format time window as human-readable string
     */
    static formatWindow(window: TimeWindow): string;
    /**
     * Check if a specific time falls within a window
     */
    static isInWindow(time: Date, window: TimeWindow): boolean;
    /**
     * PHASE 10: Check if time expression is ambiguous/vague
     * Returns true for vague expressions like "ish", "after school", "before dinner"
     */
    static isAmbiguous(text: string): boolean;
    /**
     * PHASE 10: Check if time window is too broad (needs refinement)
     * Returns true for windows > 4 hours
     */
    static isTooBroad(window: TimeWindow | null): boolean;
}
//# sourceMappingURL=TimeParser.d.ts.map