import { prisma } from '../../db';
import { logger } from '../../utils/logger';
import { doTimeRangesOverlap, addMinutes } from '../../utils/dateHelpers';
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
export async function createBooking(params: CreateBookingParams): Promise<Booking> {
  try {
    // Check for conflicts
    const conflicts = await detectConflicts(
      params.clientId,
      params.start,
      params.end
    );

    if (conflicts.length > 0) {
      throw new Error('Time slot conflicts with existing booking');
    }

    const booking = await prisma.booking.create({
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

    logger.info('Created booking', {
      bookingId: booking.id,
      clientId: params.clientId,
      start: params.start,
      end: params.end,
    });

    return booking;
  } catch (error) {
    logger.error('Error creating booking', error as Error);
    throw error;
  }
}

/**
 * Update an existing booking
 */
export async function updateBooking(
  bookingId: string,
  data: Partial<CreateBookingParams>
): Promise<Booking> {
  try {
    // If updating time, check for conflicts
    if (data.start || data.end) {
      const existing = await prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!existing) {
        throw new Error('Booking not found');
      }

      const newStart = data.start || existing.start;
      const newEnd = data.end || existing.end;

      const conflicts = await detectConflicts(
        existing.clientId,
        newStart,
        newEnd,
        bookingId // Exclude this booking from conflict check
      );

      if (conflicts.length > 0) {
        throw new Error('Time slot conflicts with existing booking');
      }
    }

    const booking = await prisma.booking.update({
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

    logger.info('Updated booking', { bookingId });

    return booking;
  } catch (error) {
    logger.error('Error updating booking', error as Error);
    throw error;
  }
}

/**
 * Cancel a booking
 */
export async function cancelBooking(bookingId: string): Promise<Booking> {
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED' },
  });

  logger.info('Cancelled booking', { bookingId });

  return booking;
}

/**
 * Get booking by ID
 */
export async function getBookingById(bookingId: string): Promise<Booking | null> {
  return prisma.booking.findUnique({
    where: { id: bookingId },
  });
}

/**
 * Get all bookings for a client
 */
export async function getBookingsByClient(
  clientId: string,
  status?: BookingStatus
): Promise<Booking[]> {
  return prisma.booking.findMany({
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
export async function getBookingsByDateRange(
  clientId: string,
  startDate: Date,
  endDate: Date
): Promise<Booking[]> {
  return prisma.booking.findMany({
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
export async function detectConflicts(
  clientId: string,
  start: Date,
  end: Date,
  excludeBookingId?: string
): Promise<Booking[]> {
  const bookings = await prisma.booking.findMany({
    where: {
      clientId,
      status: 'CONFIRMED',
      ...(excludeBookingId && { id: { not: excludeBookingId } }),
    },
  });

  const conflicts = bookings.filter((booking) =>
    doTimeRangesOverlap(start, end, booking.start, booking.end)
  );

  return conflicts;
}

/**
 * Search for available slots
 */
export async function searchAvailability(params: {
  clientId: string;
  startDate: Date;
  endDate: Date;
  durationMinutes: number;
  businessHours?: { start: string; end: string };
}): Promise<AvailabilitySlot[]> {
  try {
    const { clientId, startDate, endDate, durationMinutes, businessHours } = params;

    // Get all confirmed bookings in the range
    const bookings = await getBookingsByDateRange(clientId, startDate, endDate);

    // Generate time slots
    const slots: AvailabilitySlot[] = [];
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
        const slotEnd = addMinutes(slotStart, slotDuration);

        if (slotEnd <= dayEnd) {
          // Check if this slot conflicts with any booking
          const hasConflict = bookings.some((booking) =>
            doTimeRangesOverlap(slotStart, slotEnd, booking.start, booking.end)
          );

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
  } catch (error) {
    logger.error('Error searching availability', error as Error);
    throw error;
  }
}
