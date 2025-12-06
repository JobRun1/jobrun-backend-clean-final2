import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { WebSocketGateway } from '../realtime/WebSocketGateway';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import { sendSuccess, sendError } from '../utils/response';
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  checkEventConflicts,
} from '../modules/calendar/service';
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants';

const router = Router();

// Validation schemas
const createEventSchema = z.object({
  clientId: z.string(),
  customerId: z.string().optional(),
  title: z.string(),
  start: z.string().transform((str) => new Date(str)),
  end: z.string().transform((str) => new Date(str)),
  description: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional(),
});

const updateEventSchema = z.object({
  start: z.string().transform((str) => new Date(str)).optional(),
  end: z.string().transform((str) => new Date(str)).optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional(),
  notes: z.string().optional(),
});

const getEventsSchema = z.object({
  clientId: z.string(),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
});

/**
 * POST /api/calendar/event/create
 * Create a new calendar event
 */
router.post('/event/create', validate(createEventSchema), async (req, res, next) => {
  try {
    const data = req.body;
    const event = await createCalendarEvent(data);
    sendSuccess(res, event, HTTP_STATUS.CREATED);
  } catch (error) {
    if (error instanceof Error && error.message.includes('conflict')) {
      sendError(res, ERROR_CODES.CONFLICT, error.message, HTTP_STATUS.CONFLICT);
    } else {
      next(error);
    }
  }
});

/**
 * PUT /api/calendar/event/:id
 * Update a calendar event
 */
router.put('/event/:id', validate(updateEventSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await updateCalendarEvent(id, req.body);
    sendSuccess(res, event);
  } catch (error) {
    if (error instanceof Error && error.message.includes('conflict')) {
      sendError(res, ERROR_CODES.CONFLICT, error.message, HTTP_STATUS.CONFLICT);
    } else {
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
    const event = await deleteCalendarEvent(id);
    sendSuccess(res, event);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/calendar/events
 * Get calendar events for a date range
 */
router.post('/events', validate(getEventsSchema), async (req, res, next) => {
  try {
    const { clientId, startDate, endDate } = req.body;
    const events = await getCalendarEvents(clientId, startDate, endDate);
    sendSuccess(res, events);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/calendar/bookings/create
 * Create a new booking with customer linkage and WebSocket notification
 */
router.post('/bookings/create', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      clientId,
      customerName,
      customerPhone,
      customerEmail,
      startDate,
      startTime,
      endDate,
      endTime,
      isAllDay,
      notes,
      status,
      color,
    } = req.body;

    // Validation
    if (!clientId) {
      return sendError(res, ERROR_CODES.VALIDATION_ERROR, 'clientId is required', HTTP_STATUS.BAD_REQUEST);
    }

    if (!customerName) {
      return sendError(res, ERROR_CODES.VALIDATION_ERROR, 'customerName is required', HTTP_STATUS.BAD_REQUEST);
    }

    // Convert date + time to ISO datetime
    let start: Date;
    let end: Date;

    if (isAllDay) {
      // All-day: start at 00:00, end at 23:59
      start = new Date(`${startDate}T00:00:00`);
      end = new Date(`${endDate}T23:59:59`);
    } else {
      // Specific times
      if (!startTime || !endTime) {
        return sendError(res, ERROR_CODES.VALIDATION_ERROR, 'startTime and endTime are required for non-all-day bookings', HTTP_STATUS.BAD_REQUEST);
      }
      start = new Date(`${startDate}T${startTime}:00`);
      end = new Date(`${endDate}T${endTime}:00`);
    }

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return sendError(res, ERROR_CODES.VALIDATION_ERROR, 'Invalid date/time format', HTTP_STATUS.BAD_REQUEST);
    }

    if (start >= end) {
      return sendError(res, ERROR_CODES.VALIDATION_ERROR, 'End time must be after start time', HTTP_STATUS.BAD_REQUEST);
    }

    // Find or create customer
    let customer = null;

    if (customerPhone || customerEmail) {
      const orConditions: any[] = [];
      if (customerPhone) orConditions.push({ phone: customerPhone });
      if (customerEmail) orConditions.push({ email: customerEmail });

      customer = await prisma.customer.findFirst({
        where: {
          clientId,
          OR: orConditions,
        },
      });
    }

    if (!customer && (customerPhone || customerEmail)) {
      customer = await prisma.customer.create({
        data: {
          clientId,
          name: customerName,
          phone: customerPhone || null,
          email: customerEmail || null,
        },
      });
    }

    // Create booking
    const booking = await prisma.booking.create({
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
    WebSocketGateway.broadcastToClient(clientId, 'BOOKING_CREATED', {
      bookingId: booking.id,
      start: booking.start,
      end: booking.end,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
    });

    return sendSuccess(res, { booking }, HTTP_STATUS.CREATED);
  } catch (error) {
    console.error('[Calendar] Booking creation error:', error);
    return sendError(
      res,
      ERROR_CODES.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Failed to create booking',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * POST /api/calendar/blocked/create
 * Create blocked time with proper date/time handling per schema
 */
router.post('/blocked/create', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clientId, date, startTime, endTime, isAllDay, reason } = req.body;

    // Validation
    if (!clientId || !date) {
      return sendError(res, ERROR_CODES.VALIDATION_ERROR, 'clientId and date are required', HTTP_STATUS.BAD_REQUEST);
    }

    // Parse date
    const blockDate = new Date(date);
    if (isNaN(blockDate.getTime())) {
      return sendError(res, ERROR_CODES.VALIDATION_ERROR, 'Invalid date format', HTTP_STATUS.BAD_REQUEST);
    }

    // Validate times for non-all-day
    if (!isAllDay) {
      if (!startTime || !endTime) {
        return sendError(res, ERROR_CODES.VALIDATION_ERROR, 'startTime and endTime required for non-all-day blocks', HTTP_STATUS.BAD_REQUEST);
      }
      if (endTime <= startTime) {
        return sendError(res, ERROR_CODES.VALIDATION_ERROR, 'End time must be after start time', HTTP_STATUS.BAD_REQUEST);
      }
    }

    // Create blocked time with schema-compliant data
    const blockedTime = await prisma.blockedTime.create({
      data: {
        clientId,
        date: blockDate,
        start: isAllDay ? null : startTime,
        end: isAllDay ? null : endTime,
        reason: reason || null,
      },
    });

    // Broadcast WebSocket event
    WebSocketGateway.broadcastToClient(clientId, 'AVAILABILITY_UPDATED', {
      blockedTimeId: blockedTime.id,
      date: blockedTime.date,
      start: blockedTime.start,
      end: blockedTime.end,
    });

    return sendSuccess(res, { blockedTime }, HTTP_STATUS.CREATED);
  } catch (error) {
    console.error('[Calendar] Blocked time creation error:', error);
    return sendError(
      res,
      ERROR_CODES.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Failed to create blocked time',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

export default router;
