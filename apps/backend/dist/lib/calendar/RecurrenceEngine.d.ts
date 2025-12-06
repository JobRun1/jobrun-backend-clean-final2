import { RecurrenceFrequency } from "@prisma/client";
export interface RecurrenceRule {
    frequency: RecurrenceFrequency;
    interval: number;
    byWeekday?: string;
    byMonthday?: string;
    endDate?: Date;
    occurrences?: number;
}
export interface BookingOccurrence {
    date: Date;
    start: Date;
    end: Date;
    isRecurring: boolean;
    recurrenceRuleId?: string;
    originalBookingId: string;
    occurrenceIndex?: number;
}
export declare class RecurrenceEngine {
    static expandRule(rule: RecurrenceRule, baseStart: Date, baseEnd: Date, rangeStart: Date, rangeEnd: Date, bookingId: string, recurrenceRuleId?: string): BookingOccurrence[];
    private static matchesRule;
    private static getNextDate;
    static getOccurrenceDate(baseDate: Date, rule: RecurrenceRule, occurrenceIndex: number): Date;
    static isWithinSeries(date: Date, baseDate: Date, rule: RecurrenceRule): boolean;
}
//# sourceMappingURL=RecurrenceEngine.d.ts.map