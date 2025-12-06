import type { Booking, BookingStatus } from '@prisma/client';
interface CreateBookingParams {
    clientId: string;
    customerId?: string;
    start: Date;
    end: Date;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    notes?: string;
}
interface AvailabilitySlot {
    start: Date;
    end: Date;
    available: boolean;
}
/**
 * Create a new booking
 */
export declare function createBooking(params: CreateBookingParams): Promise<Booking>;
/**
 * Update an existing booking
 */
export declare function updateBooking(bookingId: string, data: Partial<CreateBookingParams>): Promise<Booking>;
/**
 * Cancel a booking
 */
export declare function cancelBooking(bookingId: string): Promise<Booking>;
/**
 * Get booking by ID
 */
export declare function getBookingById(bookingId: string): Promise<Booking | null>;
/**
 * Get all bookings for a client
 */
export declare function getBookingsByClient(clientId: string, status?: BookingStatus): Promise<Booking[]>;
/**
 * Get bookings for a specific date range
 */
export declare function getBookingsByDateRange(clientId: string, startDate: Date, endDate: Date): Promise<Booking[]>;
/**
 * Detect booking conflicts
 */
export declare function detectConflicts(clientId: string, start: Date, end: Date, excludeBookingId?: string): Promise<Booking[]>;
/**
 * Search for available slots
 */
export declare function searchAvailability(params: {
    clientId: string;
    startDate: Date;
    endDate: Date;
    durationMinutes: number;
    businessHours?: {
        start: string;
        end: string;
    };
}): Promise<AvailabilitySlot[]>;
export {};
//# sourceMappingURL=service.d.ts.map