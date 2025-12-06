"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const response_1 = require("../utils/response");
const constants_1 = require("../utils/constants");
const router = (0, express_1.Router)();
/**
 * GET /api/customers/:clientId
 * Get all customers for a client
 */
router.get('/:clientId', auth_1.authenticate, async (req, res) => {
    try {
        const { clientId } = req.params;
        // Verify user has access to this client
        if (req.user?.role !== 'ADMIN' && req.user?.clientId !== clientId) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.FORBIDDEN, 'Access denied', constants_1.HTTP_STATUS.FORBIDDEN);
            return;
        }
        const customers = await db_1.prisma.customer.findMany({
            where: { clientId },
            include: {
                _count: {
                    select: {
                        messages: true,
                        bookings: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        (0, response_1.sendSuccess)(res, { customers });
    }
    catch (error) {
        console.error('Failed to fetch customers:', error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch customers', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
exports.default = router;
//# sourceMappingURL=customers.js.map