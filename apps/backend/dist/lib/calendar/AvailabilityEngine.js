"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityEngine = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class AvailabilityEngine {
    static async getAvailableRanges(clientId, weekday) {
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
    static async isTimeAllowed(clientId, date, startTime, endTime) {
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
    static async hasAvailability(clientId, weekday) {
        const count = await prisma.weeklyAvailability.count({
            where: {
                clientId,
                weekday,
            },
        });
        return count > 0;
    }
    static timeToMinutes(time) {
        const [hours, minutes] = time.split(":").map((n) => parseInt(n));
        return hours * 60 + minutes;
    }
    static formatTime(date) {
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        return `${hours}:${minutes}`;
    }
    static async createAvailability(clientId, weekday, startTime, endTime) {
        return await prisma.weeklyAvailability.create({
            data: {
                clientId,
                weekday,
                startTime,
                endTime,
            },
        });
    }
    static async deleteAvailability(id) {
        return await prisma.weeklyAvailability.delete({
            where: { id },
        });
    }
    static async getAllAvailability(clientId) {
        return await prisma.weeklyAvailability.findMany({
            where: { clientId },
            orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
        });
    }
}
exports.AvailabilityEngine = AvailabilityEngine;
//# sourceMappingURL=AvailabilityEngine.js.map