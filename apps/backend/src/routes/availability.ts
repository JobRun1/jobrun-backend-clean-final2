import { Router, Response } from "express";
import { authenticate } from "../middleware/auth";
import { AuthenticatedRequest } from "../types/express";
import { sendSuccess, sendError } from "../utils/response";
import { ERROR_CODES, HTTP_STATUS } from "../utils/constants";
import { AvailabilityEngine } from "../lib/calendar/AvailabilityEngine";

const router = Router();

/**
 * GET /api/availability/:clientId
 * Get all weekly availability for a client
 */
router.get(
  "/:clientId",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { clientId } = req.params;

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

      const availability = await AvailabilityEngine.getAllAvailability(
        clientId
      );

      sendSuccess(res, { availability });
    } catch (error) {
      console.error("Failed to fetch availability:", error);
      sendError(
        res,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch availability",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }
);

/**
 * POST /api/availability
 * Create a new availability slot
 */
router.post(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { clientId, weekday, startTime, endTime } = req.body;

      if (
        !clientId ||
        weekday === undefined ||
        !startTime ||
        !endTime
      ) {
        sendError(
          res,
          ERROR_CODES.VALIDATION_ERROR,
          "Missing required fields: clientId, weekday, startTime, endTime",
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

      if (weekday < 0 || weekday > 6) {
        sendError(
          res,
          ERROR_CODES.VALIDATION_ERROR,
          "Weekday must be between 0 (Sunday) and 6 (Saturday)",
          HTTP_STATUS.BAD_REQUEST
        );
        return;
      }

      const availability = await AvailabilityEngine.createAvailability(
        clientId,
        weekday,
        startTime,
        endTime
      );

      sendSuccess(res, { availability }, HTTP_STATUS.CREATED);
    } catch (error) {
      console.error("Failed to create availability:", error);
      sendError(
        res,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to create availability",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }
);

/**
 * DELETE /api/availability/:id
 * Delete an availability slot
 */
router.delete(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      await AvailabilityEngine.deleteAvailability(id);

      sendSuccess(res, { message: "Availability deleted" });
    } catch (error) {
      console.error("Failed to delete availability:", error);
      sendError(
        res,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to delete availability",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }
);

/**
 * GET /api/availability/check/:clientId
 * Check if a specific time is available
 */
router.get(
  "/check/:clientId",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { clientId } = req.params;
      const { date, startTime, endTime } = req.query;

      if (!date || !startTime || !endTime) {
        sendError(
          res,
          ERROR_CODES.VALIDATION_ERROR,
          "Missing required parameters: date, startTime, endTime",
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

      const result = await AvailabilityEngine.isTimeAllowed(
        clientId,
        new Date(date as string),
        startTime as string,
        endTime as string
      );

      sendSuccess(res, result);
    } catch (error) {
      console.error("Failed to check availability:", error);
      sendError(
        res,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to check availability",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }
);

export default router;
