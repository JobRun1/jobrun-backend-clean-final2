import { Router } from 'express';
import { prisma } from '../db';
import { sendSuccess, sendError } from '../utils/response';
import { findOrCreateConversation, addMessage } from '../modules/conversation/service';

const router = Router();

// GET /api/client/leads?clientId=xxx&state=xxx
router.get('/', async (req, res) => {
  try {
    const { clientId, state } = req.query;

    if (!clientId || typeof clientId !== 'string') {
      return sendError(res, 'MISSING_CLIENT_ID', 'Client ID is required', 400);
    }

    const whereClause: any = {
      clientId,
    };

    if (state && typeof state === 'string' && state !== 'ALL') {
      whereClause.state = state;
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
        },
        bookings: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    const formattedLeads = customers.map((customer) => {
      const latestMessage = customer.messages[0];
      const hasBooking = customer.bookings.length > 0;

      const urgency =
        customer.state === 'POST_CALL' || customer.state === 'POST_CALL_REPLIED'
          ? 'HIGH'
          : 'NORMAL';

      const jobType = hasBooking ? customer.bookings[0].notes || 'General Service' : 'General Service';

      const hasUnread = latestMessage?.direction === 'INBOUND' || false;

      return {
        id: customer.id,
        name: customer.name || 'Unknown',
        phone: customer.phone,
        latestMessage: latestMessage?.body || 'No messages yet',
        latestTimestamp: latestMessage?.createdAt.toISOString() || customer.createdAt.toISOString(),
        state: customer.state,
        urgency,
        jobType,
        hasUnread,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
      };
    });

    sendSuccess(res, formattedLeads);
  } catch (error) {
    console.error('Failed to fetch leads:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to fetch leads', 500);
  }
});

// GET /api/client/leads/:id?clientId=xxx
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { clientId } = req.query;

    if (!clientId || typeof clientId !== 'string') {
      return sendError(res, 'MISSING_CLIENT_ID', 'Client ID is required', 400);
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        clientId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 50,
        },
        bookings: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!customer) {
      return sendError(res, 'NOT_FOUND', 'Lead not found', 404);
    }

    const latestMessage = customer.messages[0];
    const hasBooking = customer.bookings.length > 0;

    const urgency =
      customer.state === 'POST_CALL' || customer.state === 'POST_CALL_REPLIED'
        ? 'HIGH'
        : 'NORMAL';

    const jobType = hasBooking ? customer.bookings[0].notes || 'General Service' : 'General Service';

    const formattedLead = {
      id: customer.id,
      name: customer.name || 'Unknown',
      phone: customer.phone,
      email: customer.email,
      state: customer.state,
      urgency,
      jobType,
      latestMessage: latestMessage?.body || 'No messages yet',
      latestTimestamp: latestMessage?.createdAt.toISOString() || customer.createdAt.toISOString(),
      messageCount: customer.messages.length,
      bookingCount: customer.bookings.length,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
      messages: customer.messages.map((msg) => ({
        id: msg.id,
        direction: msg.direction,
        type: msg.type,
        body: msg.body,
        createdAt: msg.createdAt.toISOString(),
      })),
      bookings: customer.bookings.map((booking) => ({
        id: booking.id,
        start: booking.start.toISOString(),
        end: booking.end.toISOString(),
        status: booking.status,
        notes: booking.notes,
        createdAt: booking.createdAt.toISOString(),
      })),
    };

    sendSuccess(res, formattedLead);
  } catch (error) {
    console.error('Failed to fetch lead:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to fetch lead', 500);
  }
});

// GET /api/client/leads/:id/messages?clientId=xxx
router.get('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { clientId } = req.query;

    if (!clientId || typeof clientId !== 'string') {
      return sendError(res, 'MISSING_CLIENT_ID', 'Client ID is required', 400);
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        clientId,
      },
    });

    if (!customer) {
      return sendError(res, 'NOT_FOUND', 'Lead not found', 404);
    }

    const messages = await prisma.message.findMany({
      where: {
        customerId: id,
        clientId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 100,
    });

    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      direction: msg.direction === 'SYSTEM' ? 'AI' : msg.direction,
      type: msg.type,
      body: msg.body,
      createdAt: msg.createdAt.toISOString(),
      isRead: msg.direction === 'OUTBOUND' || msg.direction === 'SYSTEM',
    }));

    sendSuccess(res, formattedMessages);
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to fetch messages', 500);
  }
});

// POST /api/client/leads/:id/messages/send?clientId=xxx
router.post('/:id/messages/send', async (req, res) => {
  try {
    const { id } = req.params;
    const { clientId } = req.query;
    const { body, type } = req.body;

    if (!clientId || typeof clientId !== 'string') {
      return sendError(res, 'MISSING_CLIENT_ID', 'Client ID is required', 400);
    }

    if (!body || typeof body !== 'string' || body.trim() === '') {
      return sendError(res, 'INVALID_BODY', 'Message body is required', 400);
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        clientId,
      },
    });

    if (!customer) {
      return sendError(res, 'NOT_FOUND', 'Lead not found', 404);
    }

    // Find or create conversation BEFORE creating message
    // CRITICAL: Dashboard messages are operational (client → customer communication)
    const conversation = await findOrCreateConversation(clientId, id, 'OPERATIONAL');

    // Create message through conversation service
    const message = await addMessage({
      conversationId: conversation.id,
      clientId,
      customerId: id,
      direction: 'OUTBOUND',
      type: type || 'SMS',
      body: body.trim(),
    });

    const formattedMessage = {
      id: message.id,
      direction: message.direction,
      type: message.type,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      isRead: true,
    };

    sendSuccess(res, formattedMessage);
  } catch (error) {
    console.error('Failed to send message:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to send message', 500);
  }
});

// GET /api/client/leads/:id/timeline?clientId=xxx
router.get('/:id/timeline', async (req, res) => {
  try {
    const { id } = req.params;
    const { clientId } = req.query;

    if (!clientId || typeof clientId !== 'string') {
      return sendError(res, 'MISSING_CLIENT_ID', 'Client ID is required', 400);
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        clientId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        bookings: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!customer) {
      return sendError(res, 'NOT_FOUND', 'Lead not found', 404);
    }

    const events: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      timestamp: string;
    }> = [];

    events.push({
      id: `created-${customer.id}`,
      type: 'LEAD_CREATED',
      title: 'Lead Created',
      description: `${customer.name || 'Customer'} was added to the system`,
      timestamp: customer.createdAt.toISOString(),
    });

    const firstMessage = customer.messages[0];
    if (firstMessage) {
      events.push({
        id: `first-msg-${firstMessage.id}`,
        type: 'MESSAGE',
        title: 'First Message',
        description: firstMessage.body.substring(0, 100),
        timestamp: firstMessage.createdAt.toISOString(),
      });
    }

    customer.messages.forEach((msg) => {
      if (msg.direction === 'SYSTEM') {
        events.push({
          id: `ai-${msg.id}`,
          type: 'AI_ACTION',
          title: 'AI Action',
          description: msg.body,
          timestamp: msg.createdAt.toISOString(),
        });
      }
    });

    customer.bookings.forEach((booking) => {
      events.push({
        id: `booking-${booking.id}`,
        type: 'BOOKING',
        title: `Booking ${booking.status}`,
        description: `${booking.status} booking for ${new Date(booking.start).toLocaleDateString()}`,
        timestamp: booking.createdAt.toISOString(),
      });
    });

    if (customer.state !== 'NEW') {
      events.push({
        id: `state-${customer.state}`,
        type: 'STATE_CHANGE',
        title: `State Changed to ${customer.state}`,
        description: `Lead moved to ${customer.state} state`,
        timestamp: customer.updatedAt.toISOString(),
      });
    }

    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    sendSuccess(res, events);
  } catch (error) {
    console.error('Failed to fetch timeline:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to fetch timeline', 500);
  }
});

export default router;
