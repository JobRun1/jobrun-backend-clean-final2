import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { sendSuccess, sendError } from '../utils/response';
import {
  createBooking,
  updateBooking,
  cancelBooking,
  getBookingById,
  getBookingsByClient,
  searchAvailability,
} from '../modules/booking/service';
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants';

const router = Router();

// Validation schemas
const createBookingSchema = z.object({
  clientId: z.string(),
  customerId: z.string().optional(),
  start: z.string().transform((str) => new Date(str)),
  end: z.string().transform((str) => new Date(str)),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional(),
  notes: z.string().optional(),
});

const updateBookingSchema = z.object({
  start: z.string().transform((str) => new Date(str)).optional(),
  end: z.string().transform((str) => new Date(str)).optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional(),
  notes: z.string().optional(),
});

const availabilitySchema = z.object({
  clientId: z.string(),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  durationMinutes: z.number().default(30),
  businessHours: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional(),
});

/**
 * POST /api/booking/create
 * Create a new booking
 */
router.post('/create', validate(createBookingSchema), async (req, res, next) => {
  try {
    const data = req.body;
    const booking = await createBooking(data);
    sendSuccess(res, booking, HTTP_STATUS.CREATED);
  } catch (error) {
    if (error instanceof Error && error.message.includes('conflict')) {
      sendError(res, ERROR_CODES.CONFLICT, error.message, HTTP_STATUS.CONFLICT);
    } else {
      next(error);
    }
  }
});

/**
 * PUT /api/booking/:id
 * Update a booking
 */
router.put('/:id', validate(updateBookingSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await updateBooking(id, req.body);
    sendSuccess(res, booking);
  } catch (error) {
    if (error instanceof Error && error.message.includes('conflict')) {
      sendError(res, ERROR_CODES.CONFLICT, error.message, HTTP_STATUS.CONFLICT);
    } else {
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
    const booking = await cancelBooking(id);
    sendSuccess(res, booking);
  } catch (error) {
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
    const booking = await getBookingById(id);

    if (!booking) {
      sendError(res, ERROR_CODES.NOT_FOUND, 'Booking not found', HTTP_STATUS.NOT_FOUND);
      return;
    }

    sendSuccess(res, booking);
  } catch (error) {
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

    const bookings = await getBookingsByClient(
      clientId,
      status as any
    );

    sendSuccess(res, bookings);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/booking/availability
 * Search for available time slots
 */
router.post('/availability', validate(availabilitySchema), async (req, res, next) => {
  try {
    const params = req.body;
    const slots = await searchAvailability(params);
    sendSuccess(res, slots);
  } catch (error) {
    next(error);
  }
});

export default router;
