import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../db';
import { sendSuccess, sendError } from '../utils/response';
import { ERROR_CODES, HTTP_STATUS } from '../utils/constants';
import { AuthenticatedRequest } from '../types/express';

const router = Router();

// Apply authentication to all client routes
router.use(authenticate);

/**
 * GET /api/client/:clientId/dashboard/stats
 * Get dashboard statistics for a specific client
 */
router.get('/:clientId/dashboard/stats', async (req: AuthenticatedRequest, res) => {
  try {
    const { clientId } = req.params;

    // Verify user has access to this client
    if (req.user!.role !== 'ADMIN' && req.user!.clientId !== clientId) {
      sendError(res, ERROR_CODES.FORBIDDEN, 'Access denied', HTTP_STATUS.FORBIDDEN);
      return;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalLeads,
      newLeadsToday,
      postCallLeads,
      totalMessages,
      messagesToday,
      convertedLeads,
      allLeads,
      recentLeads,
      recentMessages,
    ] = await Promise.all([
      // Total leads (customers)
      prisma.customer.count({
        where: { clientId },
      }),

      // New leads today
      prisma.customer.count({
        where: {
          clientId,
          createdAt: {
            gte: startOfToday,
          },
        },
      }),

      // Post-call leads (placeholder - would use Lead model with state)
      prisma.customer.count({
        where: {
          clientId,
          // TODO: Add post-call state filter when Lead model is implemented
        },
      }),

      // Total messages
      prisma.message.count({
        where: { clientId },
      }),

      // Messages today
      prisma.message.count({
        where: {
          clientId,
          createdAt: {
            gte: startOfToday,
          },
        },
      }),

      // Converted leads (customers with bookings)
      prisma.customer.count({
        where: {
          clientId,
          bookings: {
            some: {},
          },
        },
      }),

      // All leads for conversion calculation
      prisma.customer.count({
        where: { clientId },
      }),

      // Recent leads (last 5)
      prisma.customer.findMany({
        where: { clientId },
        take: 5,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          phone: true,
          name: true,
          createdAt: true,
        },
      }),

      // Recent messages (last 10)
      prisma.message.findMany({
        where: { clientId },
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          customer: {
            select: {
              name: true,
              phone: true,
            },
          },
        },
      }),
    ]);

    // Calculate active leads (leads with messages in last 7 days)
    const activeLeads = await prisma.customer.count({
      where: {
        clientId,
        messages: {
          some: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    });

    // Calculate conversion rate
    const conversionRate = allLeads > 0
      ? Math.round((convertedLeads / allLeads) * 100)
      : 0;

    // Build lead state distribution (placeholder for future Lead model)
    const leadStateDistribution = {
      NEW: totalLeads - convertedLeads,
      POST_CALL: 0,
      POST_CALL_REPLIED: 0,
      CUSTOMER_REPLIED: 0,
      QUALIFIED: 0,
      BOOKED: 0,
      CONVERTED: convertedLeads,
      LOST: 0,
    };

    // Format recent leads
    const formattedRecentLeads = recentLeads.map((lead) => ({
      id: lead.id,
      customerNumber: lead.phone,
      name: lead.name || undefined,
      state: 'NEW' as const, // Placeholder
      createdAt: lead.createdAt.toISOString(),
    }));

    // Format recent messages
    const formattedRecentMessages = recentMessages.map((msg) => ({
      id: msg.id,
      direction: msg.direction,
      type: msg.type,
      body: msg.body,
      customerName: msg.customer?.name || undefined,
      createdAt: msg.createdAt.toISOString(),
    }));

    sendSuccess(res, {
      totalLeads,
      newLeadsToday,
      activeLeads,
      postCallLeads,
      totalMessages,
      messagesToday,
      conversionRate,
      leadStateDistribution,
      recentLeads: formattedRecentLeads,
      recentMessages: formattedRecentMessages,
    });
  } catch (error) {
    console.error('Failed to fetch client dashboard stats:', error);
    sendError(res, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch stats', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

export default router;
