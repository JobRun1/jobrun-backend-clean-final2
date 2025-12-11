import { Router } from 'express';
import { prisma } from '../db';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

// GET /api/client/dashboard/stats?clientId=xxx
router.get('/stats', async (req, res) => {
  try {
    const { clientId } = req.query;

    if (!clientId || typeof clientId !== 'string') {
      return sendError(res, 'MISSING_CLIENT_ID', 'Client ID is required', 400);
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Total leads
    const totalLeads = await prisma.customer.count({
      where: { clientId },
    });

    // New leads today
    const newLeadsToday = await prisma.customer.count({
      where: {
        clientId,
        createdAt: { gte: todayStart },
      },
    });

    // Messages today
    const messagesToday = await prisma.message.count({
      where: {
        customer: { clientId },
        createdAt: { gte: todayStart },
      },
    });

    // Conversion rate (CONVERTED / total)
    const convertedLeads = await prisma.customer.count({
      where: {
        clientId,
        state: 'CONVERTED',
      },
    });
    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0.0';

    // Lead state counts for funnel
    const leadStateCounts = await prisma.customer.groupBy({
      by: ['state'],
      where: { clientId },
      _count: { state: true },
    });

    const stateCountsMap: Record<string, number> = {};
    leadStateCounts.forEach((item) => {
      stateCountsMap[item.state] = item._count.state;
    });

    sendSuccess(res, {
      kpis: {
        totalLeads,
        newLeadsToday,
        messagesToday,
        conversionRate,
      },
      funnel: {
        NEW: stateCountsMap.NEW || 0,
        POST_CALL: stateCountsMap.POST_CALL || 0,
        POST_CALL_REPLIED: stateCountsMap.POST_CALL_REPLIED || 0,
        CUSTOMER_REPLIED: stateCountsMap.CUSTOMER_REPLIED || 0,
        QUALIFIED: stateCountsMap.QUALIFIED || 0,
        BOOKED: stateCountsMap.BOOKED || 0,
        CONVERTED: stateCountsMap.CONVERTED || 0,
        LOST: stateCountsMap.LOST || 0,
      },
    });
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to fetch dashboard stats', 500);
  }
});

// GET /api/client/dashboard/recent-messages?clientId=xxx
router.get('/recent-messages', async (req, res) => {
  try {
    const { clientId } = req.query;

    if (!clientId || typeof clientId !== 'string') {
      return sendError(res, 'MISSING_CLIENT_ID', 'Client ID is required', 400);
    }

    const messages = await prisma.message.findMany({
      where: {
        customer: { clientId },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const formatted = messages.map((msg) => ({
      id: msg.id,
      leadId: msg.customerId,
      leadName: msg.customer.name || 'Unknown',
      body: msg.body,
      direction: msg.direction === 'SYSTEM' ? 'AI' : msg.direction,
      createdAt: msg.createdAt.toISOString(),
    }));

    sendSuccess(res, formatted);
  } catch (error) {
    console.error('Failed to fetch recent messages:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to fetch recent messages', 500);
  }
});

// GET /api/client/dashboard/activity?clientId=xxx
router.get('/activity', async (req, res) => {
  try {
    const { clientId } = req.query;

    if (!clientId || typeof clientId !== 'string') {
      return sendError(res, 'MISSING_CLIENT_ID', 'Client ID is required', 400);
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get messages from today
    const messages = await prisma.message.findMany({
      where: {
        customer: { clientId },
        createdAt: { gte: todayStart },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get bookings from today
    const bookings = await prisma.booking.findMany({
      where: {
        customer: { clientId },
        createdAt: { gte: todayStart },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const activity: any[] = [];

    // Add message events
    messages.forEach((msg) => {
      if (msg.direction === 'INBOUND') {
        activity.push({
          id: `msg-${msg.id}`,
          type: 'MESSAGE',
          title: `Message from ${msg.customer.name || 'Unknown'}`,
          description: msg.body.substring(0, 60) + (msg.body.length > 60 ? '...' : ''),
          timestamp: msg.createdAt.toISOString(),
          leadId: msg.customerId,
        });
      } else if (msg.direction === 'SYSTEM') {
        activity.push({
          id: `ai-${msg.id}`,
          type: 'AI_ACTION',
          title: `AI responded to ${msg.customer.name || 'Unknown'}`,
          description: msg.body.substring(0, 60) + (msg.body.length > 60 ? '...' : ''),
          timestamp: msg.createdAt.toISOString(),
          leadId: msg.customerId,
        });
      }
    });

    // Add booking events
    bookings.forEach((booking) => {
      activity.push({
        id: `booking-${booking.id}`,
        type: 'BOOKING',
        title: `New booking from ${booking.customer.name || 'Unknown'}`,
        description: `Scheduled for ${new Date(booking.scheduledAt).toLocaleDateString()}`,
        timestamp: booking.createdAt.toISOString(),
        leadId: booking.customerId,
      });
    });

    // Sort by timestamp descending
    activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    sendSuccess(res, activity.slice(0, 10));
  } catch (error) {
    console.error('Failed to fetch activity:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to fetch activity', 500);
  }
});

export default router;
