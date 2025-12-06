"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const validate_1 = require("../middleware/validate");
const response_1 = require("../utils/response");
const service_1 = require("../modules/booking/service");
const constants_1 = require("../utils/constants");
const router = (0, express_1.Router)();
// Validation schemas
const createBookingSchema = zod_1.z.object({
    clientId: zod_1.z.string(),
    customerId: zod_1.z.string().optional(),
    start: zod_1.z.string().transform((str) => new Date(str)),
    end: zod_1.z.string().transform((str) => new Date(str)),
    customerName: zod_1.z.string().optional(),
    customerPhone: zod_1.z.string().optional(),
    customerEmail: zod_1.z.string().email().optional(),
    notes: zod_1.z.string().optional(),
});
const updateBookingSchema = zod_1.z.object({
    start: zod_1.z.string().transform((str) => new Date(str)).optional(),
    end: zod_1.z.string().transform((str) => new Date(str)).optional(),
    customerName: zod_1.z.string().optional(),
    customerPhone: zod_1.z.string().optional(),
    customerEmail: zod_1.z.string().email().optional(),
    notes: zod_1.z.string().optional(),
});
const availabilitySchema = zod_1.z.object({
    clientId: zod_1.z.string(),
    startDate: zod_1.z.string().transform((str) => new Date(str)),
    endDate: zod_1.z.string().transform((str) => new Date(str)),
    durationMinutes: zod_1.z.number().default(30),
    businessHours: zod_1.z
        .object({
        start: zod_1.z.string(),
        end: zod_1.z.string(),
    })
        .optional(),
});
/**
 * POST /api/booking/create
 * Create a new booking
 */
router.post('/create', (0, validate_1.validate)(createBookingSchema), async (req, res, next) => {
    try {
        const data = req.body;
        const booking = await (0, service_1.createBooking)(data);
        (0, response_1.sendSuccess)(res, booking, constants_1.HTTP_STATUS.CREATED);
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
 * PUT /api/booking/:id
 * Update a booking
 */
router.put('/:id', (0, validate_1.validate)(updateBookingSchema), async (req, res, next) => {
    try {
        const { id } = req.params;
        const booking = await (0, service_1.updateBooking)(id, req.body);
        (0, response_1.sendSuccess)(res, booking);
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
 * POST /api/booking/:id/cancel
 * Cancel a booking
 */
router.post('/:id/cancel', async (req, res, next) => {
    try {
        const { id } = req.params;
        const booking = await (0, service_1.cancelBooking)(id);
        (0, response_1.sendSuccess)(res, booking);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/booking/:id
 * Get a booking by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const booking = await (0, service_1.getBookingById)(id);
        if (!booking) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.NOT_FOUND, 'Booking not found', constants_1.HTTP_STATUS.NOT_FOUND);
            return;
        }
        (0, response_1.sendSuccess)(res, booking);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/booking/client/:clientId
 * Get all bookings for a client
 */
router.get('/client/:clientId', async (req, res, next) => {
    try {
        const { clientId } = req.params;
        const { status } = req.query;
        const bookings = await (0, service_1.getBookingsByClient)(clientId, status);
        (0, response_1.sendSuccess)(res, bookings);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/booking/availability
 * Search for available time slots
 */
router.post('/availability', (0, validate_1.validate)(availabilitySchema), async (req, res, next) => {
    try {
        const params = req.body;
        const slots = await (0, service_1.searchAvailability)(params);
        (0, response_1.sendSuccess)(res, slots);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=booking.js.map