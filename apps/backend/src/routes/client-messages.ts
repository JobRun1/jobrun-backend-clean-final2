import { Router } from 'express';
import { prisma } from '../db';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

// GET /api/client/messages?clientId=xxx&filter=ALL|UNREAD|INBOUND
router.get('/', async (req, res) => {
  try {
    const { clientId, filter = 'ALL' } = req.query;

    if (!clientId || typeof clientId !== 'string') {
      return sendError(res, 'MISSING_CLIENT_ID', 'Client ID is required', 400);
    }

    const customers = await prisma.customer.findMany({
      where: {
        clientId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
        bookings: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    let threads = customers
      .filter((customer) => customer.messages.length > 0)
      .map((customer) => {
        const latestMessage = customer.messages[0];
        const hasUnread = latestMessage?.direction === 'INBOUND';
        const hasBooking = customer.bookings.length > 0;
        const jobType = hasBooking
          ? customer.bookings[0].notes || 'General Service'
          : 'General Service';

        return {
          leadId: customer.id,
          name: customer.name || 'Unknown',
          phone: customer.phone,
          state: customer.state,
          jobType,
          latestMessage: {
            id: latestMessage.id,
            direction: latestMessage.direction === 'SYSTEM' ? 'AI' : latestMessage.direction,
            body: latestMessage.body,
            createdAt: latestMessage.createdAt.toISOString(),
          },
          hasUnread,
          updatedAt: customer.updatedAt.toISOString(),
        };
      });

    if (filter === 'UNREAD') {
      threads = threads.filter((thread) => thread.hasUnread);
    } else if (filter === 'INBOUND') {
      threads = threads.filter(
        (thread) => thread.latestMessage.direction === 'INBOUND'
      );
    }

    sendSuccess(res, threads);
  } catch (error) {
    console.error('Failed to fetch message threads:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to fetch message threads', 500);
  }
});

export default router;
