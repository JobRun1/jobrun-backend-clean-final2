"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const WebSocketGateway_1 = require("../realtime/WebSocketGateway");
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const response_1 = require("../utils/response");
const service_1 = require("../modules/calendar/service");
const constants_1 = require("../utils/constants");
const router = (0, express_1.Router)();
// Validation schemas
const createEventSchema = zod_1.z.object({
    clientId: zod_1.z.string(),
    customerId: zod_1.z.string().optional(),
    title: zod_1.z.string(),
    start: zod_1.z.string().transform((str) => new Date(str)),
    end: zod_1.z.string().transform((str) => new Date(str)),
    description: zod_1.z.string().optional(),
    customerName: zod_1.z.string().optional(),
    customerPhone: zod_1.z.string().optional(),
    customerEmail: zod_1.z.string().email().optional(),
});
const updateEventSchema = zod_1.z.object({
    start: zod_1.z.string().transform((str) => new Date(str)).optional(),
    end: zod_1.z.string().transform((str) => new Date(str)).optional(),
    customerName: zod_1.z.string().optional(),
    customerPhone: zod_1.z.string().optional(),
    customerEmail: zod_1.z.string().email().optional(),
    notes: zod_1.z.string().optional(),
});
const getEventsSchema = zod_1.z.object({
    clientId: zod_1.z.string(),
    startDate: zod_1.z.string().transform((str) => new Date(str)),
    endDate: zod_1.z.string().transform((str) => new Date(str)),
});
/**
 * POST /api/calendar/event/create
 * Create a new calendar event
 */
router.post('/event/create', (0, validate_1.validate)(createEventSchema), async (req, res, next) => {
    try {
        const data = req.body;
        const event = await (0, service_1.createCalendarEvent)(data);
        (0, response_1.sendSuccess)(res, event, constants_1.HTTP_STATUS.CREATED);
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('conflict')) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.CONFLICT, error.message, constants_1.HTTP_STATUS.CONFLICT);
        }
        else {
            next(error);
        }
    }
});
/**
 * PUT /api/calendar/event/:id
 * Update a calendar event
 */
router.put('/event/:id', (0, validate_1.validate)(updateEventSchema), async (req, res, next) => {
    try {
        const { id } = req.params;
        const event = await (0, service_1.updateCalendarEvent)(id, req.body);
        (0, response_1.sendSuccess)(res, event);
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('conflict')) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.CONFLICT, error.message, constants_1.HTTP_STATUS.CONFLICT);
        }
        else {
            next(error);
        }
    }
});
/**
 * DELETE /api/calendar/event/:id
 * Delete a calendar event
 */
router.delete('/event/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const event = await (0, service_1.deleteCalendarEvent)(id);
        (0, response_1.sendSuccess)(res, event);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/calendar/events
 * Get calendar events for a date range
 */
router.post('/events', (0, validate_1.validate)(getEventsSchema), async (req, res, next) => {
    try {
        const { clientId, startDate, endDate } = req.body;
        const events = await (0, service_1.getCalendarEvents)(clientId, startDate, endDate);
        (0, response_1.sendSuccess)(res, events);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/calendar/bookings/create
 * Create a new booking with customer linkage and WebSocket notification
 */
router.post('/bookings/create', auth_1.authenticate, async (req, res) => {
    try {
        const { clientId, customerName, customerPhone, customerEmail, startDate, startTime, endDate, endTime, isAllDay, notes, status, color, } = req.body;
        // Validation
        if (!clientId) {
            return (0, response_1.sendError)(res, constants_1.ERROR_CODES.VALIDATION_ERROR, 'clientId is required', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        if (!customerName) {
            return (0, response_1.sendError)(res, constants_1.ERROR_CODES.VALIDATION_ERROR, 'customerName is required', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // Convert date + time to ISO datetime
        let start;
        let end;
        if (isAllDay) {
            // All-day: start at 00:00, end at 23:59
            start = new Date(`${startDate}T00:00:00`);
            end = new Date(`${endDate}T23:59:59`);
        }
        else {
            // Specific times
            if (!startTime || !endTime) {
                return (0, response_1.sendError)(res, constants_1.ERROR_CODES.VALIDATION_ERROR, 'startTime and endTime are required for non-all-day bookings', constants_1.HTTP_STATUS.BAD_REQUEST);
            }
            start = new Date(`${startDate}T${startTime}:00`);
            end = new Date(`${endDate}T${endTime}:00`);
        }
        // Validate dates
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return (0, response_1.sendError)(res, constants_1.ERROR_CODES.VALIDATION_ERROR, 'Invalid date/time format', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        if (start >= end) {
            return (0, response_1.sendError)(res, constants_1.ERROR_CODES.VALIDATION_ERROR, 'End time must be after start time', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // Find or create customer
        let customer = null;
        if (customerPhone || customerEmail) {
            const orConditions = [];
            if (customerPhone)
                orConditions.push({ phone: customerPhone });
            if (customerEmail)
                orConditions.push({ email: customerEmail });
            customer = await db_1.prisma.customer.findFirst({
                where: {
                    clientId,
                    OR: orConditions,
                },
            });
        }
        if (!customer && (customerPhone || customerEmail)) {
            customer = await db_1.prisma.customer.create({
                data: {
                    clientId,
                    name: customerName,
                    phone: customerPhone || null,
                    email: customerEmail || null,
                },
            });
        }
        // Create booking
        const booking = await db_1.prisma.booking.create({
            data: {
                clientId,
                customerId: customer?.id,
                customerName,
                customerPhone: customerPhone || null,
                customerEmail: customerEmail || null,
                start,
                end,
                isAllDay: isAllDay || false,
                status: status || 'NEW',
                notes: notes || null,
                color: color || '#3b82f6',
            },
            include: {
                customer: true,
            },
        });
        // Broadcast WebSocket event
        WebSocketGateway_1.WebSocketGateway.broadcastToClient(clientId, 'BOOKING_CREATED', {
            bookingId: booking.id,
            start: booking.start,
            end: booking.end,
            customerName: booking.customerName,
            customerPhone: booking.customerPhone,
        });
        return (0, response_1.sendSuccess)(res, { booking }, constants_1.HTTP_STATUS.CREATED);
    }
    catch (error) {
        console.error('[Calendar] Booking creation error:', error);
        return (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, error instanceof Error ? error.message : 'Failed to create booking', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * POST /api/calendar/blocked/create
 * Create blocked time with proper date/time handling per schema
 */
router.post('/blocked/create', auth_1.authenticate, async (req, res) => {
    try {
        const { clientId, date, startTime, endTime, isAllDay, reason } = req.body;
        // Validation
        if (!clientId || !date) {
            return (0, response_1.sendError)(res, constants_1.ERROR_CODES.VALIDATION_ERROR, 'clientId and date are required', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // Parse date
        const blockDate = new Date(date);
        if (isNaN(blockDate.getTime())) {
            return (0, response_1.sendError)(res, constants_1.ERROR_CODES.VALIDATION_ERROR, 'Invalid date format', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // Validate times for non-all-day
        if (!isAllDay) {
            if (!startTime || !endTime) {
                return (0, response_1.sendError)(res, constants_1.ERROR_CODES.VALIDATION_ERROR, 'startTime and endTime required for non-all-day blocks', constants_1.HTTP_STATUS.BAD_REQUEST);
            }
            if (endTime <= startTime) {
                return (0, response_1.sendError)(res, constants_1.ERROR_CODES.VALIDATION_ERROR, 'End time must be after start time', constants_1.HTTP_STATUS.BAD_REQUEST);
            }
        }
        // Create blocked time with schema-compliant data
        const blockedTime = await db_1.prisma.blockedTime.create({
            data: {
                clientId,
                date: blockDate,
                start: isAllDay ? null : startTime,
                end: isAllDay ? null : endTime,
                reason: reason || null,
            },
        });
        // Broadcast WebSocket event
        WebSocketGateway_1.WebSocketGateway.broadcastToClient(clientId, 'AVAILABILITY_UPDATED', {
            blockedTimeId: blockedTime.id,
            date: blockedTime.date,
            start: blockedTime.start,
            end: blockedTime.end,
        });
        return (0, response_1.sendSuccess)(res, { blockedTime }, constants_1.HTTP_STATUS.CREATED);
    }
    catch (error) {
        console.error('[Calendar] Blocked time creation error:', error);
        return (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, error instanceof Error ? error.message : 'Failed to create blocked time', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
exports.default = router;
//# sourceMappingURL=calendar.js.map