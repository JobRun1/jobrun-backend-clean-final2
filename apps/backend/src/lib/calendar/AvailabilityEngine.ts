import { prisma } from "../../db";

export interface AvailabilityRange {
  weekday: number;
  startTime: string;
  endTime: string;
}

export class AvailabilityEngine {
  static async getAvailableRanges(
    clientId: string,
    weekday: number
  ): Promise<AvailabilityRange[]> {
    const availability = await prisma.weeklyAvailability.findMany({
      where: {
        clientId,
        weekday,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    return availability.map((a) => ({
      weekday: a.weekday,
      startTime: a.startTime,
      endTime: a.endTime,
    }));
  }

  static async isTimeAllowed(
    clientId: string,
    date: Date,
    startTime: string,
    endTime: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const weekday = date.getDay();
    const ranges = await this.getAvailableRanges(clientId, weekday);

    if (ranges.length === 0) {
      return {
        allowed: true,
      };
    }

    const requestedStart = this.timeToMinutes(startTime);
    const requestedEnd = this.timeToMinutes(endTime);

    for (const range of ranges) {
      const rangeStart = this.timeToMinutes(range.startTime);
      const rangeEnd = this.timeToMinutes(range.endTime);

      if (requestedStart >= rangeStart && requestedEnd <= rangeEnd) {
        return { allowed: true };
      }
    }

    return {
      allowed: false,
      reason: "Time is outside available hours",
    };
  }

  static async hasAvailability(
    clientId: string,
    weekday: number
  ): Promise<boolean> {
    const count = await prisma.weeklyAvailability.count({
      where: {
        clientId,
        weekday,
      },
    });

    return count > 0;
  }

  private static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map((n) => parseInt(n));
    return hours * 60 + minutes;
  }

  static formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  static async createAvailability(
    clientId: string,
    weekday: number,
    startTime: string,
    endTime: string
  ) {
    return await prisma.weeklyAvailability.create({
      data: {
        clientId,
        weekday,
        startTime,
        endTime,
      },
    });
  }

  static async deleteAvailability(id: string) {
    return await prisma.weeklyAvailability.delete({
      where: { id },
    });
  }

  static async getAllAvailability(clientId: string) {
    return await prisma.weeklyAvailability.findMany({
      where: { clientId },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    });
  }
}
