"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBooking = createBooking;
exports.updateBooking = updateBooking;
exports.cancelBooking = cancelBooking;
exports.getBookingById = getBookingById;
exports.getBookingsByClient = getBookingsByClient;
exports.getBookingsByDateRange = getBookingsByDateRange;
exports.detectConflicts = detectConflicts;
exports.searchAvailability = searchAvailability;
const db_1 = require("../../db");
const logger_1 = require("../../utils/logger");
const dateHelpers_1 = require("../../utils/dateHelpers");
/**
 * Create a new booking
 */
async function createBooking(params) {
    try {
        // Check for conflicts
        const conflicts = await detectConflicts(params.clientId, params.start, params.end);
        if (conflicts.length > 0) {
            throw new Error('Time slot conflicts with existing booking');
        }
        const booking = await db_1.prisma.booking.create({
            data: {
                clientId: params.clientId,
                customerId: params.customerId,
                start: params.start,
                end: params.end,
                customerName: params.customerName,
                customerPhone: params.customerPhone,
                customerEmail: params.customerEmail,
                notes: params.notes,
                status: 'CONFIRMED',
            },
        });
        logger_1.logger.info('Created booking', {
            bookingId: booking.id,
            clientId: params.clientId,
            start: params.start,
            end: params.end,
        });
        return booking;
    }
    catch (error) {
        logger_1.logger.error('Error creating booking', error);
        throw error;
    }
}
/**
 * Update an existing booking
 */
async function updateBooking(bookingId, data) {
    try {
        // If updating time, check for conflicts
        if (data.start || data.end) {
            const existing = await db_1.prisma.booking.findUnique({
                where: { id: bookingId },
            });
            if (!existing) {
                throw new Error('Booking not found');
            }
            const newStart = data.start || existing.start;
            const newEnd = data.end || existing.end;
            const conflicts = await detectConflicts(existing.clientId, newStart, newEnd, bookingId // Exclude this booking from conflict check
            );
            if (conflicts.length > 0) {
                throw new Error('Time slot conflicts with existing booking');
            }
        }
        const booking = await db_1.prisma.booking.update({
            where: { id: bookingId },
            data: {
                start: data.start,
                end: data.end,
                customerName: data.customerName,
                customerPhone: data.customerPhone,
                customerEmail: data.customerEmail,
                notes: data.notes,
            },
        });
        logger_1.logger.info('Updated booking', { bookingId });
        return booking;
    }
    catch (error) {
        logger_1.logger.error('Error updating booking', error);
        throw error;
    }
}
/**
 * Cancel a booking
 */
async function cancelBooking(bookingId) {
    const booking = await db_1.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
    });
    logger_1.logger.info('Cancelled booking', { bookingId });
    return booking;
}
/**
 * Get booking by ID
 */
async function getBookingById(bookingId) {
    return db_1.prisma.booking.findUnique({
        where: { id: bookingId },
    });
}
/**
 * Get all bookings for a client
 */
async function getBookingsByClient(clientId, status) {
    return db_1.prisma.booking.findMany({
        where: {
            clientId,
            ...(status && { status }),
        },
        orderBy: { start: 'asc' },
    });
}
/**
 * Get bookings for a specific date range
 */
async function getBookingsByDateRange(clientId, startDate, endDate) {
    return db_1.prisma.booking.findMany({
        where: {
            clientId,
            status: 'CONFIRMED',
            start: {
                gte: startDate,
                lte: endDate,
            },
        },
        orderBy: { start: 'asc' },
    });
}
/**
 * Detect booking conflicts
 */
async function detectConflicts(clientId, start, end, excludeBookingId) {
    const bookings = await db_1.prisma.booking.findMany({
        where: {
            clientId,
            status: 'CONFIRMED',
            ...(excludeBookingId && { id: { not: excludeBookingId } }),
        },
    });
    const conflicts = bookings.filter((booking) => (0, dateHelpers_1.doTimeRangesOverlap)(start, end, booking.start, booking.end));
    return conflicts;
}
/**
 * Search for available slots
 */
async function searchAvailability(params) {
    try {
        const { clientId, startDate, endDate, durationMinutes, businessHours } = params;
        // Get all confirmed bookings in the range
        const bookings = await getBookingsByDateRange(clientId, startDate, endDate);
        // Generate time slots
        const slots = [];
        const slotDuration = durationMinutes;
        // Default business hours: 9 AM to 5 PM
        const defaultBusinessHours = { start: '09:00', end: '17:00' };
        const hours = businessHours || defaultBusinessHours;
        // Iterate through each day in the range
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            // Parse business hours for this day
            const [startHour, startMinute] = hours.start.split(':').map(Number);
            const [endHour, endMinute] = hours.end.split(':').map(Number);
            let slotStart = new Date(currentDate);
            slotStart.setHours(startHour, startMinute, 0, 0);
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(endHour, endMinute, 0, 0);
            // Generate slots for this day
            while (slotStart < dayEnd) {
                const slotEnd = (0, dateHelpers_1.addMinutes)(slotStart, slotDuration);
                if (slotEnd <= dayEnd) {
                    // Check if this slot conflicts with any booking
                    const hasConflict = bookings.some((booking) => (0, dateHelpers_1.doTimeRangesOverlap)(slotStart, slotEnd, booking.start, booking.end));
                    slots.push({
                        start: new Date(slotStart),
                        end: new Date(slotEnd),
                        available: !hasConflict,
                    });
                }
                slotStart = slotEnd;
            }
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return slots;
    }
    catch (error) {
        logger_1.logger.error('Error searching availability', error);
        throw error;
    }
}
//# sourceMappingURL=service.js.map