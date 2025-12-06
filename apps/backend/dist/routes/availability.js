"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const response_1 = require("../utils/response");
const constants_1 = require("../utils/constants");
const AvailabilityEngine_1 = require("../lib/calendar/AvailabilityEngine");
const router = (0, express_1.Router)();
/**
 * GET /api/availability/:clientId
 * Get all weekly availability for a client
 */
router.get("/:clientId", auth_1.authenticate, async (req, res) => {
    try {
        const { clientId } = req.params;
        if (req.user?.role !== "ADMIN" &&
            req.user?.clientId !== clientId) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.FORBIDDEN, "Access denied", constants_1.HTTP_STATUS.FORBIDDEN);
            return;
        }
        const availability = await AvailabilityEngine_1.AvailabilityEngine.getAllAvailability(clientId);
        (0, response_1.sendSuccess)(res, { availability });
    }
    catch (error) {
        console.error("Failed to fetch availability:", error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, "Failed to fetch availability", constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * POST /api/availability
 * Create a new availability slot
 */
router.post("/", auth_1.authenticate, async (req, res) => {
    try {
        const { clientId, weekday, startTime, endTime } = req.body;
        if (!clientId ||
            weekday === undefined ||
            !startTime ||
            !endTime) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.VALIDATION_ERROR, "Missing required fields: clientId, weekday, startTime, endTime", constants_1.HTTP_STATUS.BAD_REQUEST);
            return;
        }
        if (req.user?.role !== "ADMIN" &&
            req.user?.clientId !== clientId) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.FORBIDDEN, "Access denied", constants_1.HTTP_STATUS.FORBIDDEN);
            return;
        }
        if (weekday < 0 || weekday > 6) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.VALIDATION_ERROR, "Weekday must be between 0 (Sunday) and 6 (Saturday)", constants_1.HTTP_STATUS.BAD_REQUEST);
            return;
        }
        const availability = await AvailabilityEngine_1.AvailabilityEngine.createAvailability(clientId, weekday, startTime, endTime);
        (0, response_1.sendSuccess)(res, { availability }, constants_1.HTTP_STATUS.CREATED);
    }
    catch (error) {
        console.error("Failed to create availability:", error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, "Failed to create availability", constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * DELETE /api/availability/:id
 * Delete an availability slot
 */
router.delete("/:id", auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        await AvailabilityEngine_1.AvailabilityEngine.deleteAvailability(id);
        (0, response_1.sendSuccess)(res, { message: "Availability deleted" });
    }
    catch (error) {
        console.error("Failed to delete availability:", error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, "Failed to delete availability", constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * GET /api/availability/check/:clientId
 * Check if a specific time is available
 */
router.get("/check/:clientId", auth_1.authenticate, async (req, res) => {
    try {
        const { clientId } = req.params;
        const { date, startTime, endTime } = req.query;
        if (!date || !startTime || !endTime) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.VALIDATION_ERROR, "Missing required parameters: date, startTime, endTime", constants_1.HTTP_STATUS.BAD_REQUEST);
            return;
        }
        if (req.user?.role !== "ADMIN" &&
            req.user?.clientId !== clientId) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.FORBIDDEN, "Access denied", constants_1.HTTP_STATUS.FORBIDDEN);
            return;
        }
        const result = await AvailabilityEngine_1.AvailabilityEngine.isTimeAllowed(clientId, new Date(date), startTime, endTime);
        (0, response_1.sendSuccess)(res, result);
    }
    catch (error) {
        console.error("Failed to check availability:", error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, "Failed to check availability", constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
exports.default = router;
//# sourceMappingURL=availability.js.map