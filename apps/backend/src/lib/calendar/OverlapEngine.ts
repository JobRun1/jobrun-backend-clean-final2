import { BookingStatus } from "@prisma/client";
import { prisma } from "../../db";
import { RecurrenceEngine } from "./RecurrenceEngine";

export interface OverlappingBooking {
  id: string;
  start: Date;
  end: Date;
  customerName?: string;
  status: BookingStatus;
}

export class OverlapEngine {
  static async findOverlaps(
    clientId: string,
    start: Date,
    end: Date,
    excludeBookingId?: string
  ): Promise<OverlappingBooking[]> {
    const bookings = await prisma.booking.findMany({
      where: {
        clientId,
        status: {
          notIn: ["CANCELLED"],
        },
        OR: [
          {
            start: {
              lt: end,
            },
            end: {
              gt: start,
            },
          },
        ],
      },
      include: {
        recurrenceRule: true,
      },
    });

    const overlaps: OverlappingBooking[] = [];

    for (const booking of bookings) {
      if (excludeBookingId && booking.id === excludeBookingId) {
        continue;
      }

      if (booking.recurrenceRule) {
        const occurrences = RecurrenceEngine.expandRule(
          {
            frequency: booking.recurrenceRule.frequency,
            interval: booking.recurrenceRule.interval,
            byWeekday: booking.recurrenceRule.byWeekday || undefined,
            byMonthday: booking.recurrenceRule.byMonthday || undefined,
            endDate: booking.recurrenceRule.endDate || undefined,
            occurrences: booking.recurrenceRule.occurrences || undefined,
          },
          booking.start,
          booking.end,
          new Date(Math.min(start.getTime(), booking.start.getTime())),
          new Date(Math.max(end.getTime(), booking.end.getTime())),
          booking.id,
          booking.recurrenceRule.id
        );

        for (const occurrence of occurrences) {
          if (
            occurrence.start < end &&
            occurrence.end > start
          ) {
            overlaps.push({
              id: booking.id,
              start: occurrence.start,
              end: occurrence.end,
              customerName: booking.customerName || undefined,
              status: booking.status,
            });
          }
        }
      } else {
        if (booking.start < end && booking.end > start) {
          overlaps.push({
            id: booking.id,
            start: booking.start,
            end: booking.end,
            customerName: booking.customerName || undefined,
            status: booking.status,
          });
        }
      }
    }

    return overlaps;
  }

  static async hasOverlap(
    clientId: string,
    start: Date,
    end: Date,
    excludeBookingId?: string
  ): Promise<boolean> {
    const overlaps = await this.findOverlaps(
      clientId,
      start,
      end,
      excludeBookingId
    );
    return overlaps.length > 0;
  }
}
