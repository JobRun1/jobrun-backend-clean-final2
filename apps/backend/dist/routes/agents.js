"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const response_1 = require("../utils/response");
const constants_1 = require("../utils/constants");
const router = (0, express_1.Router)();
/**
 * POST /api/agents/settings/update
 * Update agent settings for a client
 */
router.post('/settings/update', auth_1.authenticate, async (req, res) => {
    try {
        const { clientId, agentName, enabled } = req.body;
        // Verify user has access to this client
        if (req.user?.role !== 'ADMIN' && req.user?.clientId !== clientId) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.FORBIDDEN, 'Access denied', constants_1.HTTP_STATUS.FORBIDDEN);
            return;
        }
        if (!clientId || !agentName || typeof enabled !== 'boolean') {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.VALIDATION_ERROR, 'Missing required fields', constants_1.HTTP_STATUS.BAD_REQUEST);
            return;
        }
        // Get or create client settings
        let settings = await db_1.prisma.clientSettings.findUnique({
            where: { clientId },
        });
        if (!settings) {
            // Create default settings if they don't exist
            settings = await db_1.prisma.clientSettings.create({
                data: {
                    clientId,
                    agentSettings: {},
                },
            });
        }
        // Update agent settings
        const currentAgentSettings = settings.agentSettings || {};
        currentAgentSettings[agentName] = { enabled };
        const updatedSettings = await db_1.prisma.clientSettings.update({
            where: { clientId },
            data: {
                agentSettings: currentAgentSettings,
            },
        });
        (0, response_1.sendSuccess)(res, { settings: updatedSettings });
    }
    catch (error) {
        console.error('Failed to update agent settings:', error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, 'Failed to update agent settings', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * GET /api/agents/settings/:clientId
 * Get agent settings for a client
 */
router.get('/settings/:clientId', auth_1.authenticate, async (req, res) => {
    try {
        const { clientId } = req.params;
        // Verify user has access to this client
        if (req.user?.role !== 'ADMIN' && req.user?.clientId !== clientId) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.FORBIDDEN, 'Access denied', constants_1.HTTP_STATUS.FORBIDDEN);
            return;
        }
        const settings = await db_1.prisma.clientSettings.findUnique({
            where: { clientId },
        });
        if (!settings) {
            (0, response_1.sendSuccess)(res, { agentSettings: {} });
            return;
        }
        (0, response_1.sendSuccess)(res, { agentSettings: settings.agentSettings || {} });
    }
    catch (error) {
        console.error('Failed to fetch agent settings:', error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch agent settings', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
exports.default = router;
//# sourceMappingURL=agents.js.map