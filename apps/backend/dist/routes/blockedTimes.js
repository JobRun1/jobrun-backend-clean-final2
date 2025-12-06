"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const response_1 = require("../utils/response");
const constants_1 = require("../utils/constants");
const BlockedTimeEngine_1 = require("../lib/calendar/BlockedTimeEngine");
const router = (0, express_1.Router)();
/**
 * GET /api/blocked-times/:clientId
 * Get all blocked times for a client
 */
router.get("/:clientId", auth_1.authenticate, async (req, res) => {
    try {
        const { clientId } = req.params;
        if (req.user?.role !== "ADMIN" &&
            req.user?.clientId !== clientId) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.FORBIDDEN, "Access denied", constants_1.HTTP_STATUS.FORBIDDEN);
            return;
        }
        const blockedTimes = await BlockedTimeEngine_1.BlockedTimeEngine.getAllBlockedTimes(clientId);
        (0, response_1.sendSuccess)(res, { blockedTimes });
    }
    catch (error) {
        console.error("Failed to fetch blocked times:", error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, "Failed to fetch blocked times", constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * GET /api/blocked-times/range/:clientId
 * Get blocked times in a date range
 */
router.get("/range/:clientId", auth_1.authenticate, async (req, res) => {
    try {
        const { clientId } = req.params;
        const { start, end } = req.query;
        if (!start || !end) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.VALIDATION_ERROR, "Missing required parameters: start, end", constants_1.HTTP_STATUS.BAD_REQUEST);
            return;
        }
        if (req.user?.role !== "ADMIN" &&
            req.user?.clientId !== clientId) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.FORBIDDEN, "Access denied", constants_1.HTTP_STATUS.FORBIDDEN);
            return;
        }
        const blockedTimes = await BlockedTimeEngine_1.BlockedTimeEngine.findBlockedRanges(clientId, new Date(start), new Date(end));
        (0, response_1.sendSuccess)(res, { blockedTimes });
    }
    catch (error) {
        console.error("Failed to fetch blocked times:", error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, "Failed to fetch blocked times", constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * POST /api/blocked-times
 * Create a new blocked time period
 */
router.post("/", auth_1.authenticate, async (req, res) => {
    try {
        const { clientId, date, start, end, reason } = req.body;
        if (!clientId || !date) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.VALIDATION_ERROR, "Missing required fields: clientId, date", constants_1.HTTP_STATUS.BAD_REQUEST);
            return;
        }
        if (req.user?.role !== "ADMIN" &&
            req.user?.clientId !== clientId) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.FORBIDDEN, "Access denied", constants_1.HTTP_STATUS.FORBIDDEN);
            return;
        }
        const blockedTime = await BlockedTimeEngine_1.BlockedTimeEngine.createBlockedTime(clientId, new Date(date), start, end, reason);
        (0, response_1.sendSuccess)(res, { blockedTime }, constants_1.HTTP_STATUS.CREATED);
    }
    catch (error) {
        console.error("Failed to create blocked time:", error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, "Failed to create blocked time", constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * DELETE /api/blocked-times/:id
 * Delete a blocked time period
 */
router.delete("/:id", auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        await BlockedTimeEngine_1.BlockedTimeEngine.deleteBlockedTime(id);
        (0, response_1.sendSuccess)(res, { message: "Blocked time deleted" });
    }
    catch (error) {
        console.error("Failed to delete blocked time:", error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, "Failed to delete blocked time", constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * GET /api/blocked-times/check/:clientId
 * Check if a specific time is blocked
 */
router.get("/check/:clientId", auth_1.authenticate, async (req, res) => {
    try {
        const { clientId } = req.params;
        const { date, start, end } = req.query;
        if (!date) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.VALIDATION_ERROR, "Missing required parameter: date", constants_1.HTTP_STATUS.BAD_REQUEST);
            return;
        }
        if (req.user?.role !== "ADMIN" &&
            req.user?.clientId !== clientId) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.FORBIDDEN, "Access denied", constants_1.HTTP_STATUS.FORBIDDEN);
            return;
        }
        const result = await BlockedTimeEngine_1.BlockedTimeEngine.isBlocked(clientId, new Date(date), start, end);
        (0, response_1.sendSuccess)(res, result);
    }
    catch (error) {
        console.error("Failed to check blocked time:", error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, "Failed to check blocked time", constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
exports.default = router;
//# sourceMappingURL=blockedTimes.js.map