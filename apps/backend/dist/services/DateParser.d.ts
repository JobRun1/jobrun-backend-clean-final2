/**
 * DateParser - Natural Language Date Interpretation
 * Parses "tomorrow", "Friday", "next week", "the 12th"
 */
export declare class DateParser {
    private static readonly DAYS_OF_WEEK;
    private static readonly MONTHS;
    /**
     * Parse natural language date expressions
     */
    static parse(text: string, referenceDate?: Date): Date | null;
    /**
     * Helper to check if text contains any of the keywords
     */
    private static matches;
    /**
     * Format date as human-readable string
     */
    static formatDate(date: Date): string;
    /**
     * Check if a date is in the past
     */
    static isPast(date: Date): boolean;
}
//# sourceMappingURL=DateParser.d.ts.map