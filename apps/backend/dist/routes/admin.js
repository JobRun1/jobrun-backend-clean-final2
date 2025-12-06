"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const admin_1 = require("../middleware/admin");
const db_1 = require("../db");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../env");
const response_1 = require("../utils/response");
const constants_1 = require("../utils/constants");
const router = (0, express_1.Router)();
// Apply authentication and admin check to all admin routes
router.use(auth_1.authenticate);
router.use(admin_1.requireAdmin);
/**
 * GET /api/admin/dashboard/stats
 * Get dashboard statistics
 */
router.get('/dashboard/stats', async (req, res) => {
    try {
        const [totalClients, activeClients, totalMessages, totalBookings, agentLogs] = await Promise.all([
            db_1.prisma.client.count(),
            db_1.prisma.client.count(), // TODO: Add status filter when implemented
            db_1.prisma.message.count(),
            db_1.prisma.booking.count(),
            db_1.prisma.agentLog.count(),
        ]);
        (0, response_1.sendSuccess)(res, {
            totalClients,
            activeClients,
            totalMessages,
            totalBookings,
            revenue: 0, // TODO: Implement billing
            agentCalls: agentLogs,
        });
    }
    catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch stats', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * GET /api/admin/clients
 * Get all clients with stats
 */
router.get('/clients', async (req, res) => {
    try {
        const clients = await db_1.prisma.client.findMany({
            include: {
                _count: {
                    select: {
                        messages: true,
                        bookings: true,
                        customers: true,
                        users: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        (0, response_1.sendSuccess)(res, { clients });
    }
    catch (error) {
        console.error('Failed to fetch clients:', error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch clients', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * GET /api/admin/clients/:id
 * Get single client with detailed stats
 */
router.get('/clients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const client = await db_1.prisma.client.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        messages: true,
                        bookings: true,
                        customers: true,
                        users: true,
                    },
                },
            },
        });
        if (!client) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.NOT_FOUND, 'Client not found', constants_1.HTTP_STATUS.NOT_FOUND);
            return;
        }
        (0, response_1.sendSuccess)(res, { client });
    }
    catch (error) {
        console.error('Failed to fetch client:', error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch client', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * POST /api/admin/clients/:id/impersonate
 * Generate impersonation token for a client
 */
router.post('/clients/:id/impersonate', async (req, res) => {
    try {
        const { id } = req.params;
        // Verify client exists
        const client = await db_1.prisma.client.findUnique({
            where: { id },
        });
        if (!client) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.NOT_FOUND, 'Client not found', constants_1.HTTP_STATUS.NOT_FOUND);
            return;
        }
        // Generate impersonation token
        const impersonationToken = jsonwebtoken_1.default.sign({
            adminId: req.user.id,
            adminEmail: req.user.email,
            clientId: client.id,
            type: 'impersonation',
        }, env_1.env.JWT_SECRET, { expiresIn: '8h' });
        (0, response_1.sendSuccess)(res, {
            impersonationToken,
            clientId: client.id,
            businessName: client.businessName,
        });
    }
    catch (error) {
        console.error('Failed to create impersonation token:', error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, 'Failed to create impersonation token', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * GET /api/admin/calendar
 * Get all bookings across all clients
 */
router.get('/calendar', async (req, res) => {
    try {
        const bookings = await db_1.prisma.booking.findMany({
            include: {
                client: {
                    select: {
                        id: true,
                        businessName: true,
                    },
                },
            },
            orderBy: {
                start: 'asc',
            },
            take: 100,
        });
        (0, response_1.sendSuccess)(res, { bookings });
    }
    catch (error) {
        console.error('Failed to fetch bookings:', error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch bookings', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * GET /api/admin/analytics
 * Get global analytics data
 */
router.get('/analytics', async (req, res) => {
    try {
        const [totalMessages, totalBookings, totalClients, topClients, agentCalls,] = await Promise.all([
            db_1.prisma.message.count(),
            db_1.prisma.booking.count(),
            db_1.prisma.client.count(),
            db_1.prisma.client.findMany({
                include: {
                    _count: {
                        select: {
                            messages: true,
                            bookings: true,
                        },
                    },
                },
                orderBy: {
                    messages: {
                        _count: 'desc',
                    },
                },
                take: 10,
            }),
            db_1.prisma.agentLog.count(),
        ]);
        (0, response_1.sendSuccess)(res, {
            totalMessages,
            totalBookings,
            totalClients,
            totalRevenue: 0,
            agentCalls,
            conversionRate: 0,
            topClients: topClients.map(client => ({
                id: client.id,
                businessName: client.businessName,
                messageCount: client._count.messages,
                bookingCount: client._count.bookings,
            })),
        });
    }
    catch (error) {
        console.error('Failed to fetch analytics:', error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch analytics', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * GET /api/admin/agents
 * Get agent statistics
 */
router.get('/agents', async (req, res) => {
    try {
        // Get agent stats from logs
        const agentLogs = await db_1.prisma.agentLog.groupBy({
            by: ['agentName'],
            _count: {
                _all: true,
            },
            _avg: {
                executionTimeMs: true,
            },
        });
        (0, response_1.sendSuccess)(res, { agents: agentLogs });
    }
    catch (error) {
        console.error('Failed to fetch agent stats:', error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch agent stats', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * GET /api/admin/agents/:name
 * Get detailed logs for a specific agent
 */
router.get('/agents/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const logs = await db_1.prisma.agentLog.findMany({
            where: {
                agentName: name,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 50,
        });
        (0, response_1.sendSuccess)(res, { logs });
    }
    catch (error) {
        console.error('Failed to fetch agent logs:', error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch agent logs', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * GET /api/admin/system
 * Get system diagnostics
 */
router.get('/system', async (req, res) => {
    try {
        // Basic system health check
        const [clientCount, messageCount, errorLogs] = await Promise.all([
            db_1.prisma.client.count(),
            db_1.prisma.message.count(),
            db_1.prisma.agentLog.count({
                where: {
                    error: {
                        not: null,
                    },
                },
            }),
        ]);
        (0, response_1.sendSuccess)(res, {
            status: 'operational',
            uptime: 99.8,
            clients: clientCount,
            messages: messageCount,
            errors: errorLogs,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Failed to fetch system status:', error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch system status', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map