import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface BlockedRange {
  id: string;
  date: Date;
  start?: string;
  end?: string;
  reason?: string;
  isAllDay: boolean;
}

export class BlockedTimeEngine {
  static async isBlocked(
    clientId: string,
    date: Date,
    startTime?: string,
    endTime?: string
  ): Promise<{ blocked: boolean; reason?: string }> {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    const nextDay = new Date(dateOnly);
    nextDay.setDate(nextDay.getDate() + 1);

    const blockedTimes = await prisma.blockedTime.findMany({
      where: {
        clientId,
        date: {
          gte: dateOnly,
          lt: nextDay,
        },
      },
    });

    for (const blocked of blockedTimes) {
      if (!blocked.start || !blocked.end) {
        return {
          blocked: true,
          reason: blocked.reason || "All-day block",
        };
      }

      if (startTime && endTime) {
        const requestedStart = this.timeToMinutes(startTime);
        const requestedEnd = this.timeToMinutes(endTime);
        const blockedStart = this.timeToMinutes(blocked.start);
        const blockedEnd = this.timeToMinutes(blocked.end);

        if (
          (requestedStart >= blockedStart && requestedStart < blockedEnd) ||
          (requestedEnd > blockedStart && requestedEnd <= blockedEnd) ||
          (requestedStart <= blockedStart && requestedEnd >= blockedEnd)
        ) {
          return {
            blocked: true,
            reason: blocked.reason || "Time is blocked",
          };
        }
      }
    }

    return { blocked: false };
  }

  static async findBlockedRanges(
    clientId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BlockedRange[]> {
    const blocked = await prisma.blockedTime.findMany({
      where: {
        clientId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    return blocked.map((b) => ({
      id: b.id,
      date: b.date,
      start: b.start || undefined,
      end: b.end || undefined,
      reason: b.reason || undefined,
      isAllDay: !b.start || !b.end,
    }));
  }

  static async createBlockedTime(
    clientId: string,
    date: Date,
    start?: string,
    end?: string,
    reason?: string
  ) {
    return await prisma.blockedTime.create({
      data: {
        clientId,
        date,
        start,
        end,
        reason,
      },
    });
  }

  static async deleteBlockedTime(id: string) {
    return await prisma.blockedTime.delete({
      where: { id },
    });
  }

  static async getAllBlockedTimes(clientId: string) {
    return await prisma.blockedTime.findMany({
      where: { clientId },
      orderBy: {
        date: "asc",
      },
    });
  }

  private static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map((n) => parseInt(n));
    return hours * 60 + minutes;
  }
}
