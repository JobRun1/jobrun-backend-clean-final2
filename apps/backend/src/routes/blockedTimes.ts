import { Router, Response } from "express";
import { authenticate } from "../middleware/auth";
import { AuthenticatedRequest } from "../types/express";
import { sendSuccess, sendError } from "../utils/response";
import { ERROR_CODES, HTTP_STATUS } from "../utils/constants";
import { BlockedTimeEngine } from "../lib/calendar/BlockedTimeEngine";

const router = Router();

/**
 * GET /api/blocked-times/:clientId
 * Get all blocked times for a client
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

      const blockedTimes = await BlockedTimeEngine.getAllBlockedTimes(
        clientId
      );

      sendSuccess(res, { blockedTimes });
    } catch (error) {
      console.error("Failed to fetch blocked times:", error);
      sendError(
        res,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch blocked times",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }
);

/**
 * GET /api/blocked-times/range/:clientId
 * Get blocked times in a date range
 */
router.get(
  "/range/:clientId",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { clientId } = req.params;
      const { start, end } = req.query;

      if (!start || !end) {
        sendError(
          res,
          ERROR_CODES.VALIDATION_ERROR,
          "Missing required parameters: start, end",
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

      const blockedTimes = await BlockedTimeEngine.findBlockedRanges(
        clientId,
        new Date(start as string),
        new Date(end as string)
      );

      sendSuccess(res, { blockedTimes });
    } catch (error) {
      console.error("Failed to fetch blocked times:", error);
      sendError(
        res,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch blocked times",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }
);

/**
 * POST /api/blocked-times
 * Create a new blocked time period
 */
router.post(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { clientId, date, start, end, reason } = req.body;

      if (!clientId || !date) {
        sendError(
          res,
          ERROR_CODES.VALIDATION_ERROR,
          "Missing required fields: clientId, date",
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

      const blockedTime = await BlockedTimeEngine.createBlockedTime(
        clientId,
        new Date(date),
        start,
        end,
        reason
      );

      sendSuccess(res, { blockedTime }, HTTP_STATUS.CREATED);
    } catch (error) {
      console.error("Failed to create blocked time:", error);
      sendError(
        res,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to create blocked time",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }
);

/**
 * DELETE /api/blocked-times/:id
 * Delete a blocked time period
 */
router.delete(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      await BlockedTimeEngine.deleteBlockedTime(id);

      sendSuccess(res, { message: "Blocked time deleted" });
    } catch (error) {
      console.error("Failed to delete blocked time:", error);
      sendError(
        res,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to delete blocked time",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }
);

/**
 * GET /api/blocked-times/check/:clientId
 * Check if a specific time is blocked
 */
router.get(
  "/check/:clientId",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { clientId } = req.params;
      const { date, start, end } = req.query;

      if (!date) {
        sendError(
          res,
          ERROR_CODES.VALIDATION_ERROR,
          "Missing required parameter: date",
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

      const result = await BlockedTimeEngine.isBlocked(
        clientId,
        new Date(date as string),
        start as string | undefined,
        end as string | undefined
      );

      sendSuccess(res, result);
    } catch (error) {
      console.error("Failed to check blocked time:", error);
      sendError(
        res,
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to check blocked time",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }
);

export default router;
