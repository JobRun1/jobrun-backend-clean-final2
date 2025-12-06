import { Router, Response } from "express";
import { prisma } from "../db";
import { authenticate } from "../middleware/auth";
import { AuthenticatedRequest } from "../types/express";
import { sendSuccess, sendError } from "../utils/response";
import { ERROR_CODES, HTTP_STATUS } from "../utils/constants";
import { RecurrenceEngine } from "../lib/calendar/RecurrenceEngine";
import { AvailabilityEngine } from "../lib/calendar/AvailabilityEngine";
import { BlockedTimeEngine } from "../lib/calendar/BlockedTimeEngine";
import { OverlapEngine } from "../lib/calendar/OverlapEngine";
import { RecurrenceFrequency, BookingStatus } from "@prisma/client";

const router = Router();

/**
 * GET /api/bookings/range
 * Get all booking occurrences in a date range (expands recurrence rules)
 */
router.get(
  "/range",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { clientId, start, end } = req.query;

      if (!clientId || !start || !end) {
        sendError(
          res,
          ERROR_CODES.VALIDATION_ERROR,
          "Missing required parameters: clientId, start, end",
          HTTP_STATUS.BAD_REQUEST
        );
        return;
      }

      if (
        req.user?.role !== "ADMIN" &&
        req.user?.clientId !== clientId
      ) {
        sendError(
          res,
          ERROR_CODES.FORBIDDEN,
          "Access denied",
          HTTP_STATUS.FORBIDDEN
        );
        return;
      }

      const rangeStart = new Date(start as string);
      const rangeEnd = new Date(end as string);

      const bookings = await prisma.booking.findMany({
        where: {
          clientId: clientId as string,
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
          const expanded = RecurrenceEngine.expandRule(
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
            rangeStart,
            rangeEnd,
            booking.id,
            booking.recurrenceRule.id
          );

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
        } else {
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

      occurrences.sort(
        (a, b) => a.start.getTime() - b.start.getTime()
      );

      sendSuccess(res, { bookings: occurrences });
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
      sendError(
        res,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch bookings",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }
);

/**
 * GET /api/bookings/:id
 * Get a single booking by ID
 */
router.get(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          recurrenceRule: true,
          customer: true,
        },
      });

      if (!booking) {
        sendError(
          res,
          ERROR_CODES.NOT_FOUND,
          "Booking not found",
          HTTP_STATUS.NOT_FOUND
        );
        return;
      }

      if (
        req.user?.role !== "ADMIN" &&
        req.user?.clientId !== booking.clientId
      ) {
        sendError(
          res,
          ERROR_CODES.FORBIDDEN,
          "Access denied",
          HTTP_STATUS.FORBIDDEN
        );
        return;
      }

      sendSuccess(res, { booking });
    } catch (error) {
      console.error("Failed to fetch booking:", error);
      sendError(
        res,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch booking",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }
);

/**
 * POST /api/bookings
 * Create a new booking (with optional recurrence)
 */
router.post(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        clientId,
        customerId,
        customerName,
        customerPhone,
        customerEmail,
        start,
        end,
        isAllDay,
        status,
        notes,
        color,
        recurrenceRule,
      } = req.body;

      if (!clientId || !start || !end) {
        sendError(
          res,
          ERROR_CODES.VALIDATION_ERROR,
          "Missing required fields",
          HTTP_STATUS.BAD_REQUEST
        );
        return;
      }

      if (
        req.user?.role !== "ADMIN" &&
        req.user?.clientId !== clientId
      ) {
        sendError(
          res,
          ERROR_CODES.FORBIDDEN,
          "Access denied",
          HTTP_STATUS.FORBIDDEN
        );
        return;
      }

      const startDate = new Date(start);
      const endDate = new Date(end);

      const warnings = [];

      if (!isAllDay) {
        const startTime = AvailabilityEngine.formatTime(startDate);
        const endTime = AvailabilityEngine.formatTime(endDate);

        const availabilityCheck = await AvailabilityEngine.isTimeAllowed(
          clientId,
          startDate,
          startTime,
          endTime
        );

        if (!availabilityCheck.allowed) {
          warnings.push({
            type: "availability",
            message: availabilityCheck.reason,
          });
        }

        const blockedCheck = await BlockedTimeEngine.isBlocked(
          clientId,
          startDate,
          startTime,
          endTime
        );

        if (blockedCheck.blocked) {
          warnings.push({
            type: "blocked",
            message: blockedCheck.reason,
          });
        }
      }

      const overlapCheck = await OverlapEngine.findOverlaps(
        clientId,
        startDate,
        endDate
      );

      if (overlapCheck.length > 0) {
        warnings.push({
          type: "overlap",
          message: `Overlaps with ${overlapCheck.length} existing booking(s)`,
          overlaps: overlapCheck,
        });
      }

      let recurrenceRuleRecord = null;

      if (recurrenceRule) {
        recurrenceRuleRecord = await prisma.recurrenceRule.create({
          data: {
            clientId,
            frequency: recurrenceRule.frequency as RecurrenceFrequency,
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

      const booking = await prisma.booking.create({
        data: {
          clientId,
          customerId,
          customerName,
          customerPhone,
          customerEmail,
          start: startDate,
          end: endDate,
          isAllDay: isAllDay || false,
          status: (status as BookingStatus) || "NEW",
          notes,
          color,
          recurrenceRuleId: recurrenceRuleRecord?.id,
        },
        include: {
          recurrenceRule: true,
          customer: true,
        },
      });

      sendSuccess(res, { booking, warnings }, HTTP_STATUS.CREATED);
    } catch (error) {
      console.error("Failed to create booking:", error);
      sendError(
        res,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to create booking",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }
);

/**
 * PATCH /api/bookings/:id
 * Edit a booking (supports "single", "following", "all" modes for recurring bookings)
 */
router.patch(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { mode, ...updateData } = req.body;

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: { recurrenceRule: true },
      });

      if (!booking) {
        sendError(
          res,
          ERROR_CODES.NOT_FOUND,
          "Booking not found",
          HTTP_STATUS.NOT_FOUND
        );
        return;
      }

      if (
        req.user?.role !== "ADMIN" &&
        req.user?.clientId !== booking.clientId
      ) {
        sendError(
          res,
          ERROR_CODES.FORBIDDEN,
          "Access denied",
          HTTP_STATUS.FORBIDDEN
        );
        return;
      }

      if (mode === "single" && booking.recurrenceRuleId) {
        const newBooking = await prisma.booking.create({
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

        sendSuccess(res, { booking: newBooking });
        return;
      }

      if (mode === "following" && booking.recurrenceRule) {
        const newRule = await prisma.recurrenceRule.create({
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

        const updatedBooking = await prisma.booking.update({
          where: { id },
          data: {
            recurrenceRuleId: newRule.id,
            ...updateData,
            start: updateData.start ? new Date(updateData.start) : undefined,
            end: updateData.end ? new Date(updateData.end) : undefined,
          },
          include: { recurrenceRule: true },
        });

        sendSuccess(res, { booking: updatedBooking });
        return;
      }

      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: {
          ...updateData,
          start: updateData.start ? new Date(updateData.start) : undefined,
          end: updateData.end ? new Date(updateData.end) : undefined,
        },
        include: { recurrenceRule: true, customer: true },
      });

      sendSuccess(res, { booking: updatedBooking });
    } catch (error) {
      console.error("Failed to update booking:", error);
      sendError(
        res,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to update booking",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }
);

/**
 * DELETE /api/bookings/:id
 * Delete a booking (supports "single", "following", "all" modes for recurring bookings)
 */
router.delete(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { mode } = req.query;

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: { recurrenceRule: true },
      });

      if (!booking) {
        sendError(
          res,
          ERROR_CODES.NOT_FOUND,
          "Booking not found",
          HTTP_STATUS.NOT_FOUND
        );
        return;
      }

      if (
        req.user?.role !== "ADMIN" &&
        req.user?.clientId !== booking.clientId
      ) {
        sendError(
          res,
          ERROR_CODES.FORBIDDEN,
          "Access denied",
          HTTP_STATUS.FORBIDDEN
        );
        return;
      }

      if (mode === "single" && booking.recurrenceRuleId) {
        await prisma.booking.update({
          where: { id },
          data: { status: "CANCELLED" },
        });

        sendSuccess(res, { message: "Booking cancelled" });
        return;
      }

      if (mode === "all" && booking.recurrenceRuleId) {
        await prisma.booking.deleteMany({
          where: { recurrenceRuleId: booking.recurrenceRuleId },
        });

        await prisma.recurrenceRule.delete({
          where: { id: booking.recurrenceRuleId },
        });

        sendSuccess(res, { message: "All bookings in series deleted" });
        return;
      }

      await prisma.booking.delete({
        where: { id },
      });

      sendSuccess(res, { message: "Booking deleted" });
    } catch (error) {
      console.error("Failed to delete booking:", error);
      sendError(
        res,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to delete booking",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }
);

export default router;
