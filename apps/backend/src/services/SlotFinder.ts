/**
 * SlotFinder - Find Available Booking Slots
 * Integrates with:
 * - Availability system (Phase 5)
 * - Blocked times system (Phase 5)
 * - Existing bookings (Phase 3)
 */

import { prisma } from '../db';
import { TimeWindow } from './TimeParser';

export interface SlotRequest {
  clientId: string;
  preferredDate?: Date;
  timeWindow?: TimeWindow;
  durationMinutes: number;
  searchDaysAhead?: number;
}

export interface AvailableSlot {
  start: Date;
  end: Date;
  isAvailable: boolean;
}

export class SlotFinder {
  /**
   * Find the earliest available slot
   */
  static async findEarliestSlot(request: SlotRequest): Promise<Date | null> {
    const slots = await this.findAvailableSlots(request);
    return slots.length > 0 ? slots[0].start : null;
  }

  /**
   * Find all available slots matching criteria
   */
  static async findAvailableSlots(request: SlotRequest): Promise<AvailableSlot[]> {
    const { clientId, preferredDate, timeWindow, durationMinutes, searchDaysAhead = 14 } = request;

    const startDate = preferredDate || new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + searchDaysAhead);

    // Get client's availability rules
    const availabilityRules = await prisma.weeklyAvailability.findMany({
      where: { clientId },
    });

    // Get blocked times in range
    const blockedTimes = await prisma.blockedTime.findMany({
      where: {
        clientId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Get existing bookings in range
    const existingBookings = await prisma.booking.findMany({
      where: {
        clientId,
        start: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          not: 'CANCELLED',
        },
      },
    });

    const availableSlots: AvailableSlot[] = [];
    const currentDate = new Date(startDate);

    // Search each day
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();

      // Get availability for this day
      const dayAvailability = availabilityRules.filter((rule) => rule.weekday === dayOfWeek);

      if (dayAvailability.length === 0) {
        // No availability set for this day - skip
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Check each availability window for this day
      for (const rule of dayAvailability) {
        const slots = this.generateSlotsInWindow(
          currentDate,
          rule.startTime,
          rule.endTime,
          durationMinutes,
          timeWindow
        );

        for (const slot of slots) {
          if (
            !this.isBlocked(slot.start, slot.end, blockedTimes) &&
            !this.isBooked(slot.start, slot.end, existingBookings) &&
            slot.start > new Date() // Must be in future
          ) {
            availableSlots.push(slot);
          }
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Sort by earliest first
    availableSlots.sort((a, b) => a.start.getTime() - b.start.getTime());

    return availableSlots;
  }

  /**
   * Generate time slots within a specific window on a given day
   */
  private static generateSlotsInWindow(
    date: Date,
    startTime: string,
    endTime: string,
    durationMinutes: number,
    timeWindow?: TimeWindow
  ): AvailableSlot[] {
    const slots: AvailableSlot[] = [];

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    let currentSlot = new Date(date);
    currentSlot.setHours(startHour, startMinute, 0, 0);

    const endDateTime = new Date(date);
    endDateTime.setHours(endHour, endMinute, 0, 0);

    // Generate slots every 15 minutes (or based on duration)
    const slotInterval = 15; // minutes

    while (currentSlot < endDateTime) {
      const slotEnd = new Date(currentSlot);
      slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

      // Check if slot end is within business hours
      if (slotEnd <= endDateTime) {
        // If timeWindow specified, check if slot is in window
        if (!timeWindow || this.isInTimeWindow(currentSlot, timeWindow)) {
          slots.push({
            start: new Date(currentSlot),
            end: slotEnd,
            isAvailable: true,
          });
        }
      }

      currentSlot.setMinutes(currentSlot.getMinutes() + slotInterval);
    }

    return slots;
  }

  /**
   * Check if a time slot is blocked
   */
  private static isBlocked(slotStart: Date, slotEnd: Date, blockedTimes: any[]): boolean {
    for (const block of blockedTimes) {
      const blockDate = new Date(block.date);
      const slotDate = new Date(slotStart);

      // Normalize dates to compare only date part
      blockDate.setHours(0, 0, 0, 0);
      slotDate.setHours(0, 0, 0, 0);

      // Check if block is on same date
      if (blockDate.getTime() !== slotDate.getTime()) continue;

      // All-day block (start and end are null)
      if (!block.start && !block.end) return true;

      // Time-specific block
      if (block.start && block.end) {
        const blockStart = this.parseTime(slotStart, block.start);
        const blockEnd = this.parseTime(slotStart, block.end);

        // Check if slot overlaps with block
        if (slotStart < blockEnd && slotEnd > blockStart) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if a slot overlaps with existing bookings
   */
  private static isBooked(start: Date, end: Date, bookings: any[]): boolean {
    for (const booking of bookings) {
      const bookingStart = new Date(booking.start);
      const bookingEnd = new Date(booking.end);

      // Check for overlap
      if (start < bookingEnd && end > bookingStart) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if time is within a time window
   */
  private static isInTimeWindow(time: Date, window: TimeWindow): boolean {
    const hour = time.getHours();
    const minute = time.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    const startInMinutes = window.startHour * 60 + window.startMinute;
    const endInMinutes = window.endHour * 60 + window.endMinute;

    return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Parse time string into Date object on specific date
   */
  private static parseTime(date: Date, timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  /**
   * Check if a specific day is closed (no availability)
   */
  static async isDayClosed(clientId: string, date: Date): Promise<boolean> {
    const dayOfWeek = date.getDay();

    const availability = await prisma.weeklyAvailability.findMany({
      where: {
        clientId,
        weekday: dayOfWeek,
      },
    });

    return availability.length === 0;
  }

  /**
   * Find next open day
   */
  static async findNextOpenDay(clientId: string, afterDate: Date): Promise<Date | null> {
    const searchDate = new Date(afterDate);
    const maxDaysAhead = 30;

    for (let i = 0; i < maxDaysAhead; i++) {
      searchDate.setDate(searchDate.getDate() + 1);

      const isClosed = await this.isDayClosed(clientId, searchDate);
      if (!isClosed) {
        return searchDate;
      }
    }

    return null;
  }
}
