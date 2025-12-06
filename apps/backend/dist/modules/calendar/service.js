"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCalendarEvent = createCalendarEvent;
exports.updateCalendarEvent = updateCalendarEvent;
exports.deleteCalendarEvent = deleteCalendarEvent;
exports.getCalendarEvents = getCalendarEvents;
exports.checkEventConflicts = checkEventConflicts;
const db_1 = require("../../db");
const logger_1 = require("../../utils/logger");
const service_1 = require("../booking/service");
/**
 * Create a calendar event (booking)
 */
async function createCalendarEvent(params) {
    try {
        // Check for conflicts
        const conflicts = await (0, service_1.detectConflicts)(params.clientId, params.start, params.end);
        if (conflicts.length > 0) {
            throw new Error('Event conflicts with existing booking');
        }
        const event = await db_1.prisma.booking.create({
            data: {
                clientId: params.clientId,
                customerId: params.customerId,
                start: params.start,
                end: params.end,
                customerName: params.customerName,
                customerPhone: params.customerPhone,
                customerEmail: params.customerEmail,
                notes: params.description,
                status: 'CONFIRMED',
            },
        });
        logger_1.logger.info('Created calendar event', {
            eventId: event.id,
            start: params.start,
            end: params.end,
        });
        return event;
    }
    catch (error) {
        logger_1.logger.error('Error creating calendar event', error);
        throw error;
    }
}
/**
 * Update a calendar event
 */
async function updateCalendarEvent(eventId, data) {
    try {
        // If updating time, check for conflicts
        if (data.start || data.end) {
            const existing = await db_1.prisma.booking.findUnique({
                where: { id: eventId },
            });
            if (!existing) {
                throw new Error('Event not found');
            }
            const newStart = data.start || existing.start;
            const newEnd = data.end || existing.end;
            const conflicts = await (0, service_1.detectConflicts)(existing.clientId, newStart, newEnd, eventId);
            if (conflicts.length > 0) {
                throw new Error('Event conflicts with existing booking');
            }
        }
        const event = await db_1.prisma.booking.update({
            where: { id: eventId },
            data,
        });
        logger_1.logger.info('Updated calendar event', { eventId });
        return event;
    }
    catch (error) {
        logger_1.logger.error('Error updating calendar event', error);
        throw error;
    }
}
/**
 * Delete a calendar event
 */
async function deleteCalendarEvent(eventId) {
    const event = await db_1.prisma.booking.update({
        where: { id: eventId },
        data: { status: 'CANCELLED' },
    });
    logger_1.logger.info('Deleted calendar event', { eventId });
    return event;
}
/**
 * Get calendar events for a date range
 */
async function getCalendarEvents(clientId, startDate, endDate) {
    const bookings = await db_1.prisma.booking.findMany({
        where: {
            clientId,
            status: { not: 'CANCELLED' },
            start: {
                gte: startDate,
                lte: endDate,
            },
        },
        orderBy: { start: 'asc' },
    });
    return bookings.map((booking) => ({
        id: booking.id,
        title: booking.customerName || 'Booking',
        start: booking.start,
        end: booking.end,
        description: booking.notes || undefined,
        customerName: booking.customerName || undefined,
        customerPhone: booking.customerPhone || undefined,
    }));
}
/**
 * Check if a time slot is available
 */
async function checkEventConflicts(clientId, start, end, excludeEventId) {
    const conflicts = await (0, service_1.detectConflicts)(clientId, start, end, excludeEventId);
    return conflicts.length > 0;
}
//# sourceMappingURL=service.js.map