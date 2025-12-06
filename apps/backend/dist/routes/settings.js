"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const db_1 = require("../db");
const response_1 = require("../utils/response");
const constants_1 = require("../utils/constants");
const router = (0, express_1.Router)();
// Apply authentication to all settings routes
router.use(auth_1.authenticate);
/**
 * GET /api/settings/:clientId
 * Get client settings including theme
 */
router.get('/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        // Verify user has access to this client
        if (req.user?.clientId && req.user.clientId !== clientId && req.user?.role !== 'ADMIN') {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.UNAUTHORIZED, 'Unauthorized', constants_1.HTTP_STATUS.UNAUTHORIZED);
            return;
        }
        let settings = await db_1.prisma.clientSettings.findUnique({
            where: { clientId },
        });
        // Create default settings if they don't exist
        if (!settings) {
            settings = await db_1.prisma.clientSettings.create({
                data: {
                    clientId,
                },
            });
        }
        (0, response_1.sendSuccess)(res, settings);
    }
    catch (error) {
        console.error('Failed to fetch client settings:', error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch settings', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * PUT /api/settings/:clientId
 * Update client settings
 */
router.put('/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        const { businessName, services, availability, pricing, phoneNumber, email, website, serviceArea, theme, metadata } = req.body;
        // Verify user has access to this client
        if (req.user?.clientId && req.user.clientId !== clientId && req.user?.role !== 'ADMIN') {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.UNAUTHORIZED, 'Unauthorized', constants_1.HTTP_STATUS.UNAUTHORIZED);
            return;
        }
        // Get or create settings
        let settings = await db_1.prisma.clientSettings.findUnique({
            where: { clientId },
        });
        if (!settings) {
            settings = await db_1.prisma.clientSettings.create({
                data: { clientId },
            });
        }
        // Update settings
        const updatedSettings = await db_1.prisma.clientSettings.update({
            where: { clientId },
            data: {
                ...(businessName !== undefined && { businessName }),
                ...(services !== undefined && { services }),
                ...(availability !== undefined && { availability }),
                ...(pricing !== undefined && { pricing }),
                ...(phoneNumber !== undefined && { phoneNumber }),
                ...(email !== undefined && { email }),
                ...(website !== undefined && { website }),
                ...(serviceArea !== undefined && { serviceArea }),
                ...(theme !== undefined && { theme }),
                ...(metadata !== undefined && { metadata }),
            },
        });
        (0, response_1.sendSuccess)(res, updatedSettings);
    }
    catch (error) {
        console.error('Failed to update client settings:', error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, 'Failed to update settings', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * PUT /api/settings/:clientId/theme
 * Update only theme settings
 */
router.put('/:clientId/theme', async (req, res) => {
    try {
        const { clientId } = req.params;
        const { theme } = req.body;
        // Verify user has access to this client
        if (req.user?.clientId && req.user.clientId !== clientId && req.user?.role !== 'ADMIN') {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.UNAUTHORIZED, 'Unauthorized', constants_1.HTTP_STATUS.UNAUTHORIZED);
            return;
        }
        if (!theme) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.INVALID_INPUT, 'Theme is required', constants_1.HTTP_STATUS.BAD_REQUEST);
            return;
        }
        // Validate theme structure
        if (!theme.id || !theme.name || !theme.colors) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.INVALID_INPUT, 'Invalid theme structure', constants_1.HTTP_STATUS.BAD_REQUEST);
            return;
        }
        // Get or create settings
        let settings = await db_1.prisma.clientSettings.findUnique({
            where: { clientId },
        });
        if (!settings) {
            settings = await db_1.prisma.clientSettings.create({
                data: { clientId },
            });
        }
        // Update theme
        const updatedSettings = await db_1.prisma.clientSettings.update({
            where: { clientId },
            data: {
                theme,
            },
        });
        (0, response_1.sendSuccess)(res, updatedSettings);
    }
    catch (error) {
        console.error('Failed to update theme:', error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, 'Failed to update theme', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * DELETE /api/settings/:clientId/theme
 * Reset theme to default
 */
router.delete('/:clientId/theme', async (req, res) => {
    try {
        const { clientId } = req.params;
        // Verify user has access to this client
        if (req.user?.clientId && req.user.clientId !== clientId && req.user?.role !== 'ADMIN') {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.UNAUTHORIZED, 'Unauthorized', constants_1.HTTP_STATUS.UNAUTHORIZED);
            return;
        }
        const updatedSettings = await db_1.prisma.clientSettings.update({
            where: { clientId },
            data: {
                theme: client_1.Prisma.DbNull,
            },
        });
        (0, response_1.sendSuccess)(res, updatedSettings);
    }
    catch (error) {
        console.error('Failed to reset theme:', error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, 'Failed to reset theme', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
exports.default = router;
//# sourceMappingURL=settings.js.map