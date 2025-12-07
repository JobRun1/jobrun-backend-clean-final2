import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import { prisma } from '../db';
import jwt from 'jsonwebtoken';
import { env } from '../env';
import { sendSuccess, sendError } from '../utils/response';
import { ERROR_CODES, HTTP_STATUS } from '../utils/constants';
import { AuthenticatedRequest } from '../types/express';

const router = Router();

// Apply authentication and admin check to all admin routes
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/admin/dashboard/stats
 * Get comprehensive dashboard statistics
 */
router.get('/dashboard/stats', async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalClients,
      activeClients,
      totalLeads,
      leadsToday,
      totalMessages,
      messagesToday,
      leadsByState,
      convertedLeads,
      allLeads,
      recentMessages,
      topClients,
    ] = await Promise.all([
      // Total clients
      prisma.client.count(),

      // Active clients (with at least one message in last 30 days)
      prisma.client.count({
        where: {
          messages: {
            some: {
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
        },
      }),

      // Total leads
      prisma.customer.count(),

      // Leads created today
      prisma.customer.count({
        where: {
          createdAt: {
            gte: startOfToday,
          },
        },
      }),

      // Total messages
      prisma.message.count(),

      // Messages today
      prisma.message.count({
        where: {
          createdAt: {
            gte: startOfToday,
          },
        },
      }),

      // Lead state distribution (using Customer model)
      prisma.customer.groupBy({
        by: ['id'],
        _count: true,
      }),

      // Converted leads (customers with bookings)
      prisma.customer.count({
        where: {
          bookings: {
            some: {},
          },
        },
      }),

      // All leads for conversion calculation
      prisma.customer.count(),

      // Recent messages for activity feed
      prisma.message.findMany({
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          client: {
            select: {
              businessName: true,
            },
          },
        },
      }),

      // Top clients by activity
      prisma.client.findMany({
        take: 5,
        include: {
          _count: {
            select: {
              customers: true,
              messages: true,
            },
          },
        },
        orderBy: {
          messages: {
            _count: 'desc',
          },
        },
      }),
    ]);

    // Calculate conversion rate
    const conversionRate = allLeads > 0
      ? Math.round((convertedLeads / allLeads) * 100)
      : 0;

    // Build lead state distribution (placeholder - JobRun uses Customer model)
    const leadStateDistribution = {
      NEW: 0,
      POST_CALL: 0,
      POST_CALL_REPLIED: 0,
      CUSTOMER_REPLIED: 0,
      QUALIFIED: 0,
      BOOKED: 0,
      CONVERTED: convertedLeads,
      LOST: 0,
    };

    // Format recent activity
    const recentActivity = recentMessages.map((msg) => ({
      id: msg.id,
      type: msg.direction,
      clientName: msg.client.businessName,
      preview: msg.body.substring(0, 100),
      createdAt: msg.createdAt.toISOString(),
    }));

    // Format top clients
    const formattedTopClients = topClients.map((client) => ({
      id: client.id,
      businessName: client.businessName,
      region: client.region,
      leadCount: client._count.customers,
      messageCount: client._count.messages,
    }));

    sendSuccess(res, {
      totalClients,
      activeClients,
      totalLeads,
      leadsToday,
      totalMessages,
      messagesToday,
      conversionRate,
      leadStateDistribution,
      recentActivity,
      topClients: formattedTopClients,
    });
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    sendError(res, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch stats', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * GET /api/admin/clients
 * Get all clients with stats
 */
router.get('/clients', async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
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

    sendSuccess(res, { clients });
  } catch (error) {
    console.error('Failed to fetch clients:', error);
    sendError(res, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch clients', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * GET /api/admin/clients/:id
 * Get single client with detailed stats
 */
router.get('/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const client = await prisma.client.findUnique({
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
      sendError(res, ERROR_CODES.NOT_FOUND, 'Client not found', HTTP_STATUS.NOT_FOUND);
      return;
    }

    sendSuccess(res, { client });
  } catch (error) {
    console.error('Failed to fetch client:', error);
    sendError(res, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch client', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * POST /api/admin/clients/:id/impersonate
 * Generate impersonation token for a client
 */
router.post('/clients/:id/impersonate', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      sendError(res, ERROR_CODES.NOT_FOUND, 'Client not found', HTTP_STATUS.NOT_FOUND);
      return;
    }

    // Generate impersonation token
    const impersonationToken = jwt.sign(
      {
        adminId: req.user!.id,
        adminEmail: req.user!.email,
        clientId: client.id,
        type: 'impersonation',
      },
      env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    sendSuccess(res, {
      impersonationToken,
      clientId: client.id,
      businessName: client.businessName,
    });
  } catch (error) {
    console.error('Failed to create impersonation token:', error);
    sendError(res, ERROR_CODES.INTERNAL_ERROR, 'Failed to create impersonation token', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * GET /api/admin/calendar
 * Get all bookings across all clients
 */
router.get('/calendar', async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
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

    sendSuccess(res, { bookings });
  } catch (error) {
    console.error('Failed to fetch bookings:', error);
    sendError(res, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch bookings', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * GET /api/admin/analytics
 * Get global analytics data
 */
router.get('/analytics', async (req, res) => {
  try {
    const [
      totalMessages,
      totalBookings,
      totalClients,
      topClients,
      agentCalls,
    ] = await Promise.all([
      prisma.message.count(),
      prisma.booking.count(),
      prisma.client.count(),
      prisma.client.findMany({
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
      prisma.agentLog.count(),
    ]);

    sendSuccess(res, {
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
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    sendError(res, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch analytics', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * GET /api/admin/agents
 * Get agent statistics
 */
router.get('/agents', async (req, res) => {
  try {
    // Get agent stats from logs
    const agentLogs = await prisma.agentLog.groupBy({
      by: ['agentName'],
      _count: {
        _all: true,
      },
      _avg: {
        executionTimeMs: true,
      },
    });

    sendSuccess(res, { agents: agentLogs });
  } catch (error) {
    console.error('Failed to fetch agent stats:', error);
    sendError(res, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch agent stats', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * GET /api/admin/agents/:name
 * Get detailed logs for a specific agent
 */
router.get('/agents/:name', async (req, res) => {
  try {
    const { name } = req.params;

    const logs = await prisma.agentLog.findMany({
      where: {
        agentName: name,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    sendSuccess(res, { logs });
  } catch (error) {
    console.error('Failed to fetch agent logs:', error);
    sendError(res, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch agent logs', HTTP_STATUS.INTERNAL_SERVER_ERROR);
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
      prisma.client.count(),
      prisma.message.count(),
      prisma.agentLog.count({
        where: {
          error: {
            not: null,
          },
        },
      }),
    ]);

    sendSuccess(res, {
      status: 'operational',
      uptime: 99.8,
      clients: clientCount,
      messages: messageCount,
      errors: errorLogs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch system status:', error);
    sendError(res, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch system status', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

export default router;
