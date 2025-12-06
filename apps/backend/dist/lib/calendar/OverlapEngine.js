"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverlapEngine = void 0;
const client_1 = require("@prisma/client");
const RecurrenceEngine_1 = require("./RecurrenceEngine");
const prisma = new client_1.PrismaClient();
class OverlapEngine {
    static async findOverlaps(clientId, start, end, excludeBookingId) {
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
        const overlaps = [];
        for (const booking of bookings) {
            if (excludeBookingId && booking.id === excludeBookingId) {
                continue;
            }
            if (booking.recurrenceRule) {
                const occurrences = RecurrenceEngine_1.RecurrenceEngine.expandRule({
                    frequency: booking.recurrenceRule.frequency,
                    interval: booking.recurrenceRule.interval,
                    byWeekday: booking.recurrenceRule.byWeekday || undefined,
                    byMonthday: booking.recurrenceRule.byMonthday || undefined,
                    endDate: booking.recurrenceRule.endDate || undefined,
                    occurrences: booking.recurrenceRule.occurrences || undefined,
                }, booking.start, booking.end, new Date(Math.min(start.getTime(), booking.start.getTime())), new Date(Math.max(end.getTime(), booking.end.getTime())), booking.id, booking.recurrenceRule.id);
                for (const occurrence of occurrences) {
                    if (occurrence.start < end &&
                        occurrence.end > start) {
                        overlaps.push({
                            id: booking.id,
                            start: occurrence.start,
                            end: occurrence.end,
                            customerName: booking.customerName || undefined,
                            status: booking.status,
                        });
                    }
                }
            }
            else {
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
    static async hasOverlap(clientId, start, end, excludeBookingId) {
        const overlaps = await this.findOverlaps(clientId, start, end, excludeBookingId);
        return overlaps.length > 0;
    }
}
exports.OverlapEngine = OverlapEngine;
//# sourceMappingURL=OverlapEngine.js.map