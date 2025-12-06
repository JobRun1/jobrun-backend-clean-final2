/**
 * SlotFinder - Find Available Booking Slots
 * Integrates with:
 * - Availability system (Phase 5)
 * - Blocked times system (Phase 5)
 * - Existing bookings (Phase 3)
 */
import { TimeWindow } from './TimeParser';
export interface SlotRequest {
    clientId: string;
    preferredDate?: Date;
    timeWindow?: TimeWindow;
    durationMinutes: number;
    searchDaysAhead?: number;
}
export interface AvailableSlot {
    start: Date;
    end: Date;
    isAvailable: boolean;
}
export declare class SlotFinder {
    /**
     * Find the earliest available slot
     */
    static findEarliestSlot(request: SlotRequest): Promise<Date | null>;
    /**
     * Find all available slots matching criteria
     */
    static findAvailableSlots(request: SlotRequest): Promise<AvailableSlot[]>;
    /**
     * Generate time slots within a specific window on a given day
     */
    private static generateSlotsInWindow;
    /**
     * Check if a time slot is blocked
     */
    private static isBlocked;
    /**
     * Check if a slot overlaps with existing bookings
     */
    private static isBooked;
    /**
     * Check if time is within a time window
     */
    private static isInTimeWindow;
    /**
     * Format date as YYYY-MM-DD
     */
    private static formatDate;
    /**
     * Parse time string into Date object on specific date
     */
    private static parseTime;
    /**
     * Check if a specific day is closed (no availability)
     */
    static isDayClosed(clientId: string, date: Date): Promise<boolean>;
    /**
     * Find next open day
     */
    static findNextOpenDay(clientId: string, afterDate: Date): Promise<Date | null>;
}
//# sourceMappingURL=SlotFinder.d.ts.map