/**
 * Date utility functions for JobRun
 */
/**
 * Check if two time ranges overlap
 */
export declare function doTimeRangesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean;
/**
 * Add minutes to a date
 */
export declare function addMinutes(date: Date, minutes: number): Date;
/**
 * Parse time string (HH:MM) to hours and minutes
 */
export declare function parseTimeString(time: string): {
    hours: number;
    minutes: number;
};
/**
 * Check if a date is within business hours
 */
export declare function isWithinBusinessHours(date: Date, businessHours: {
    start: string;
    end: string;
    days?: number[];
}): boolean;
/**
 * Get start of day
 */
export declare function startOfDay(date: Date): Date;
/**
 * Get end of day
 */
export declare function endOfDay(date: Date): Date;
/**
 * Format date as YYYY-MM-DD
 */
export declare function formatDateOnly(date: Date): string;
//# sourceMappingURL=dateHelpers.d.ts.map