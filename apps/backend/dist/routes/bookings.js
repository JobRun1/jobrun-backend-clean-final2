"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const response_1 = require("../utils/response");
const constants_1 = require("../utils/constants");
const RecurrenceEngine_1 = require("../lib/calendar/RecurrenceEngine");
const AvailabilityEngine_1 = require("../lib/calendar/AvailabilityEngine");
const BlockedTimeEngine_1 = require("../lib/calendar/BlockedTimeEngine");
const OverlapEngine_1 = require("../lib/calendar/OverlapEngine");
const router = (0, express_1.Router)();
/**
 * GET /api/bookings/range
 * Get all booking occurrences in a date range (expands recurrence rules)
 */
router.get("/range", auth_1.authenticate, async (req, res) => {
    try {
        const { clientId, start, end } = req.query;
        if (!clientId || !start || !end) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.VALIDATION_ERROR, "Missing required parameters: clientId, start, end", constants_1.HTTP_STATUS.BAD_REQUEST);
            return;
        }
        if (req.user?.role !== "ADMIN" &&
            req.user?.clientId !== clientId) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.FORBIDDEN, "Access denied", constants_1.HTTP_STATUS.FORBIDDEN);
            return;
        }
        const rangeStart = new Date(start);
        const rangeEnd = new Date(end);
        const bookings = await db_1.prisma.booking.findMany({
            where: {
                clientId: clientId,
                status: {
                    notIn: ["CANCELLED"],
                },
            },
            include: {
                recurrenceRule: true,
                customer: true,
            },
        });
        const occurrences = [];
        for (const booking of bookings) {
            if (booking.recurrenceRule) {
                const expanded = RecurrenceEngine_1.RecurrenceEngine.expandRule({
                    frequency: booking.recurrenceRule.frequency,
                    interval: booking.recurrenceRule.interval,
                    byWeekday: booking.recurrenceRule.byWeekday || undefined,
                    byMonthday: booking.recurrenceRule.byMonthday || undefined,
                    endDate: booking.recurrenceRule.endDate || undefined,
                    occurrences: booking.recurrenceRule.occurrences || undefined,
                }, booking.start, booking.end, rangeStart, rangeEnd, booking.id, booking.recurrenceRule.id);
                for (const occ of expanded) {
                    occurrences.push({
                        id: booking.id,
                        start: occ.start,
                        end: occ.end,
                        customerName: booking.customerName,
                        customerPhone: booking.customerPhone,
                        customerEmail: booking.customerEmail,
                        customerId: booking.customerId,
                        status: booking.status,
                        notes: booking.notes,
                        color: booking.color,
                        isAllDay: booking.isAllDay,
                        isRecurring: true,
                        recurrenceRuleId: booking.recurrenceRuleId,
                        occurrenceIndex: occ.occurrenceIndex,
                    });
                }
            }
            else {
                if (booking.start >= rangeStart && booking.start <= rangeEnd) {
                    occurrences.push({
                        id: booking.id,
                        start: booking.start,
                        end: booking.end,
                        customerName: booking.customerName,
                        customerPhone: booking.customerPhone,
                        customerEmail: booking.customerEmail,
                        customerId: booking.customerId,
                        status: booking.status,
                        notes: booking.notes,
                        color: booking.color,
                        isAllDay: booking.isAllDay,
                        isRecurring: false,
                    });
                }
            }
        }
        occurrences.sort((a, b) => a.start.getTime() - b.start.getTime());
        (0, response_1.sendSuccess)(res, { bookings: occurrences });
    }
    catch (error) {
        console.error("Failed to fetch bookings:", error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, "Failed to fetch bookings", constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * GET /api/bookings/:id
 * Get a single booking by ID
 */
router.get("/:id", auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await db_1.prisma.booking.findUnique({
            where: { id },
            include: {
                recurrenceRule: true,
                customer: true,
            },
        });
        if (!booking) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.NOT_FOUND, "Booking not found", constants_1.HTTP_STATUS.NOT_FOUND);
            return;
        }
        if (req.user?.role !== "ADMIN" &&
            req.user?.clientId !== booking.clientId) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.FORBIDDEN, "Access denied", constants_1.HTTP_STATUS.FORBIDDEN);
            return;
        }
        (0, response_1.sendSuccess)(res, { booking });
    }
    catch (error) {
        console.error("Failed to fetch booking:", error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, "Failed to fetch booking", constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * POST /api/bookings
 * Create a new booking (with optional recurrence)
 */
router.post("/", auth_1.authenticate, async (req, res) => {
    try {
        const { clientId, customerId, customerName, customerPhone, customerEmail, start, end, isAllDay, status, notes, color, recurrenceRule, } = req.body;
        if (!clientId || !start || !end) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.VALIDATION_ERROR, "Missing required fields", constants_1.HTTP_STATUS.BAD_REQUEST);
            return;
        }
        if (req.user?.role !== "ADMIN" &&
            req.user?.clientId !== clientId) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.FORBIDDEN, "Access denied", constants_1.HTTP_STATUS.FORBIDDEN);
            return;
        }
        const startDate = new Date(start);
        const endDate = new Date(end);
        const warnings = [];
        if (!isAllDay) {
            const startTime = AvailabilityEngine_1.AvailabilityEngine.formatTime(startDate);
            const endTime = AvailabilityEngine_1.AvailabilityEngine.formatTime(endDate);
            const availabilityCheck = await AvailabilityEngine_1.AvailabilityEngine.isTimeAllowed(clientId, startDate, startTime, endTime);
            if (!availabilityCheck.allowed) {
                warnings.push({
                    type: "availability",
                    message: availabilityCheck.reason,
                });
            }
            const blockedCheck = await BlockedTimeEngine_1.BlockedTimeEngine.isBlocked(clientId, startDate, startTime, endTime);
            if (blockedCheck.blocked) {
                warnings.push({
                    type: "blocked",
                    message: blockedCheck.reason,
                });
            }
        }
        const overlapCheck = await OverlapEngine_1.OverlapEngine.findOverlaps(clientId, startDate, endDate);
        if (overlapCheck.length > 0) {
            warnings.push({
                type: "overlap",
                message: `Overlaps with ${overlapCheck.length} existing booking(s)`,
                overlaps: overlapCheck,
            });
        }
        let recurrenceRuleRecord = null;
        if (recurrenceRule) {
            recurrenceRuleRecord = await db_1.prisma.recurrenceRule.create({
                data: {
                    clientId,
                    frequency: recurrenceRule.frequency,
                    interval: recurrenceRule.interval || 1,
                    byWeekday: recurrenceRule.byWeekday,
                    byMonthday: recurrenceRule.byMonthday,
                    endDate: recurrenceRule.endDate
                        ? new Date(recurrenceRule.endDate)
                        : null,
                    occurrences: recurrenceRule.occurrences,
                },
            });
        }
        const booking = await db_1.prisma.booking.create({
            data: {
                clientId,
                customerId,
                customerName,
                customerPhone,
                customerEmail,
                start: startDate,
                end: endDate,
                isAllDay: isAllDay || false,
                status: status || "NEW",
                notes,
                color,
                recurrenceRuleId: recurrenceRuleRecord?.id,
            },
            include: {
                recurrenceRule: true,
                customer: true,
            },
        });
        (0, response_1.sendSuccess)(res, { booking, warnings }, constants_1.HTTP_STATUS.CREATED);
    }
    catch (error) {
        console.error("Failed to create booking:", error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, "Failed to create booking", constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * PATCH /api/bookings/:id
 * Edit a booking (supports "single", "following", "all" modes for recurring bookings)
 */
router.patch("/:id", auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { mode, ...updateData } = req.body;
        const booking = await db_1.prisma.booking.findUnique({
            where: { id },
            include: { recurrenceRule: true },
        });
        if (!booking) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.NOT_FOUND, "Booking not found", constants_1.HTTP_STATUS.NOT_FOUND);
            return;
        }
        if (req.user?.role !== "ADMIN" &&
            req.user?.clientId !== booking.clientId) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.FORBIDDEN, "Access denied", constants_1.HTTP_STATUS.FORBIDDEN);
            return;
        }
        if (mode === "single" && booking.recurrenceRuleId) {
            const newBooking = await db_1.prisma.booking.create({
                data: {
                    clientId: booking.clientId,
                    customerId: updateData.customerId || booking.customerId,
                    customerName: updateData.customerName || booking.customerName,
                    customerPhone: updateData.customerPhone || booking.customerPhone,
                    customerEmail: updateData.customerEmail || booking.customerEmail,
                    start: updateData.start
                        ? new Date(updateData.start)
                        : booking.start,
                    end: updateData.end ? new Date(updateData.end) : booking.end,
                    isAllDay: updateData.isAllDay ?? booking.isAllDay,
                    status: updateData.status || booking.status,
                    notes: updateData.notes ?? booking.notes,
                    color: updateData.color ?? booking.color,
                },
            });
            (0, response_1.sendSuccess)(res, { booking: newBooking });
            return;
        }
        if (mode === "following" && booking.recurrenceRule) {
            const newRule = await db_1.prisma.recurrenceRule.create({
                data: {
                    clientId: booking.clientId,
                    frequency: booking.recurrenceRule.frequency,
                    interval: booking.recurrenceRule.interval,
                    byWeekday: booking.recurrenceRule.byWeekday,
                    byMonthday: booking.recurrenceRule.byMonthday,
                    endDate: booking.recurrenceRule.endDate,
                    occurrences: booking.recurrenceRule.occurrences,
                },
            });
            const updatedBooking = await db_1.prisma.booking.update({
                where: { id },
                data: {
                    recurrenceRuleId: newRule.id,
                    ...updateData,
                    start: updateData.start ? new Date(updateData.start) : undefined,
                    end: updateData.end ? new Date(updateData.end) : undefined,
                },
                include: { recurrenceRule: true },
            });
            (0, response_1.sendSuccess)(res, { booking: updatedBooking });
            return;
        }
        const updatedBooking = await db_1.prisma.booking.update({
            where: { id },
            data: {
                ...updateData,
                start: updateData.start ? new Date(updateData.start) : undefined,
                end: updateData.end ? new Date(updateData.end) : undefined,
            },
            include: { recurrenceRule: true, customer: true },
        });
        (0, response_1.sendSuccess)(res, { booking: updatedBooking });
    }
    catch (error) {
        console.error("Failed to update booking:", error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, "Failed to update booking", constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * DELETE /api/bookings/:id
 * Delete a booking (supports "single", "following", "all" modes for recurring bookings)
 */
router.delete("/:id", auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { mode } = req.query;
        const booking = await db_1.prisma.booking.findUnique({
            where: { id },
            include: { recurrenceRule: true },
        });
        if (!booking) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.NOT_FOUND, "Booking not found", constants_1.HTTP_STATUS.NOT_FOUND);
            return;
        }
        if (req.user?.role !== "ADMIN" &&
            req.user?.clientId !== booking.clientId) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.FORBIDDEN, "Access denied", constants_1.HTTP_STATUS.FORBIDDEN);
            return;
        }
        if (mode === "single" && booking.recurrenceRuleId) {
            await db_1.prisma.booking.update({
                where: { id },
                data: { status: "CANCELLED" },
            });
            (0, response_1.sendSuccess)(res, { message: "Booking cancelled" });
            return;
        }
        if (mode === "all" && booking.recurrenceRuleId) {
            await db_1.prisma.booking.deleteMany({
                where: { recurrenceRuleId: booking.recurrenceRuleId },
            });
            await db_1.prisma.recurrenceRule.delete({
                where: { id: booking.recurrenceRuleId },
            });
            (0, response_1.sendSuccess)(res, { message: "All bookings in series deleted" });
            return;
        }
        await db_1.prisma.booking.delete({
            where: { id },
        });
        (0, response_1.sendSuccess)(res, { message: "Booking deleted" });
    }
    catch (error) {
        console.error("Failed to delete booking:", error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, "Failed to delete booking", constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
exports.default = router;
//# sourceMappingURL=bookings.js.map