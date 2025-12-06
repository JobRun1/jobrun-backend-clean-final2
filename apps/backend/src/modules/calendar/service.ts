import { prisma } from '../../db';
import { logger } from '../../utils/logger';
import { detectConflicts } from '../booking/service';
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
export async function createCalendarEvent(params: {
  clientId: string;
  customerId?: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}): Promise<Booking> {
  try {
    // Check for conflicts
    const conflicts = await detectConflicts(params.clientId, params.start, params.end);

    if (conflicts.length > 0) {
      throw new Error('Event conflicts with existing booking');
    }

    const event = await prisma.booking.create({
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

    logger.info('Created calendar event', {
      eventId: event.id,
      start: params.start,
      end: params.end,
    });

    return event;
  } catch (error) {
    logger.error('Error creating calendar event', error as Error);
    throw error;
  }
}

/**
 * Update a calendar event
 */
export async function updateCalendarEvent(
  eventId: string,
  data: {
    start?: Date;
    end?: Date;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    notes?: string;
  }
): Promise<Booking> {
  try {
    // If updating time, check for conflicts
    if (data.start || data.end) {
      const existing = await prisma.booking.findUnique({
        where: { id: eventId },
      });

      if (!existing) {
        throw new Error('Event not found');
      }

      const newStart = data.start || existing.start;
      const newEnd = data.end || existing.end;

      const conflicts = await detectConflicts(
        existing.clientId,
        newStart,
        newEnd,
        eventId
      );

      if (conflicts.length > 0) {
        throw new Error('Event conflicts with existing booking');
      }
    }

    const event = await prisma.booking.update({
      where: { id: eventId },
      data,
    });

    logger.info('Updated calendar event', { eventId });

    return event;
  } catch (error) {
    logger.error('Error updating calendar event', error as Error);
    throw error;
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(eventId: string): Promise<Booking> {
  const event = await prisma.booking.update({
    where: { id: eventId },
    data: { status: 'CANCELLED' },
  });

  logger.info('Deleted calendar event', { eventId });

  return event;
}

/**
 * Get calendar events for a date range
 */
export async function getCalendarEvents(
  clientId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const bookings = await prisma.booking.findMany({
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
export async function checkEventConflicts(
  clientId: string,
  start: Date,
  end: Date,
  excludeEventId?: string
): Promise<boolean> {
  const conflicts = await detectConflicts(clientId, start, end, excludeEventId);
  return conflicts.length > 0;
}
