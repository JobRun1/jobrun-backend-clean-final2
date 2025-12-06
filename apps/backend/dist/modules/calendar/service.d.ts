import type { Booking } from '@prisma/client';
interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    description?: string;
    customerName?: string;
    customerPhone?: string;
}
/**
 * Create a calendar event (booking)
 */
export declare function createCalendarEvent(params: {
    clientId: string;
    customerId?: string;
    title: string;
    start: Date;
    end: Date;
    description?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
}): Promise<Booking>;
/**
 * Update a calendar event
 */
export declare function updateCalendarEvent(eventId: string, data: {
    start?: Date;
    end?: Date;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    notes?: string;
}): Promise<Booking>;
/**
 * Delete a calendar event
 */
export declare function deleteCalendarEvent(eventId: string): Promise<Booking>;
/**
 * Get calendar events for a date range
 */
export declare function getCalendarEvents(clientId: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]>;
/**
 * Check if a time slot is available
 */
export declare function checkEventConflicts(clientId: string, start: Date, end: Date, excludeEventId?: string): Promise<boolean>;
export {};
//# sourceMappingURL=service.d.ts.map