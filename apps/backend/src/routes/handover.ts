/**
 * Handover API Routes
 * PHASE 11A: Human Handover Mode
 *
 * Routes:
 * - GET /:conversationId - Get handover details
 * - POST /:conversationId/close - Close handover
 * - POST /:conversationId/reply - Send human reply
 * - GET /inbox - Get all active handovers for client
 */

import { Router, Request, Response } from 'express';
import { HandoverManager } from '../services/HandoverManager';
import { ConversationMemory } from '../services/ConversationMemory';
import { AdminLogger } from '../services/AdminLogger';

const router = Router();

/**
 * GET /api/handover/inbox
 * Get all active handovers for authenticated client
 */
router.get('/inbox', async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.id || (req as any).user?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    // Get all active handovers
    const handovers = await HandoverManager.getActiveHandovers(clientId);

    // Enrich with conversation data
    const enrichedHandovers = handovers.map((handover) => {
      const lastMessages = ConversationMemory.getLastNMessages(
        handover.conversationId,
        10
      );

      return {
        ...handover,
        lastMessages,
        messageCount: lastMessages.length,
      };
    });

    return res.json({
      success: true,
      data: {
        handovers: enrichedHandovers,
        count: enrichedHandovers.length,
      },
    });
  } catch (error) {
    console.error('Get handover inbox error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get handover inbox',
      },
    });
  }
});

/**
 * GET /api/handover/:conversationId
 * Get handover details for specific conversation
 */
router.get('/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const clientId = (req as any).user?.id || (req as any).user?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    // Get handover state
    const handover = await HandoverManager.getHandoverState(conversationId);

    if (!handover) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Handover not found',
        },
      });
    }

    // Verify client owns this handover
    if (handover.clientId !== clientId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    // Get conversation messages
    const messages = ConversationMemory.getLastNMessages(conversationId, 50);

    // Get conversation preferences
    const preferences = ConversationMemory.getPreferences(conversationId);

    return res.json({
      success: true,
      data: {
        handover,
        messages,
        preferences,
      },
    });
  } catch (error) {
    console.error('Get handover details error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get handover details',
      },
    });
  }
});

/**
 * POST /api/handover/:conversationId/close
 * Close a handover (mark as resolved)
 */
router.post('/:conversationId/close', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const clientId = (req as any).user?.id || (req as any).user?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    // Verify handover exists and belongs to client
    const handover = await HandoverManager.getHandoverState(conversationId);

    if (!handover) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Handover not found',
        },
      });
    }

    if (handover.clientId !== clientId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    // Close the handover
    await HandoverManager.endHandover(conversationId);

    // Un-silence AI for this conversation
    ConversationMemory.unsilence(conversationId);

    // Log closure
    AdminLogger.log('handover_closed', conversationId, clientId, {
      handoverId: handover.id,
      reason: handover.reason,
    });

    return res.json({
      success: true,
      data: {
        message: 'Handover closed successfully',
        conversationId,
      },
    });
  } catch (error) {
    console.error('Close handover error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to close handover',
      },
    });
  }
});

/**
 * POST /api/handover/:conversationId/reply
 * Send human reply to customer
 */
router.post('/:conversationId/reply', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;
    const clientId = (req as any).user?.id || (req as any).user?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Message is required',
        },
      });
    }

    // Verify handover exists and belongs to client
    const handover = await HandoverManager.getHandoverState(conversationId);

    if (!handover) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Handover not found',
        },
      });
    }

    if (handover.clientId !== clientId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    // TODO: Send message to customer via Twilio
    // For now, just log it
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`💬 HUMAN REPLY SENT`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Conversation: ${conversationId}`);
    console.log(`Message: ${message}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Log human reply
    AdminLogger.log('human_reply_sent', conversationId, clientId, {
      message,
      handoverId: handover.id,
    });

    // Add message to conversation memory
    ConversationMemory.addMessage(conversationId, message, 'human');

    return res.json({
      success: true,
      data: {
        message: 'Reply sent successfully',
        conversationId,
      },
    });
  } catch (error) {
    console.error('Send human reply error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to send reply',
      },
    });
  }
});

/**
 * GET /api/handover/stats
 * Get handover statistics for client
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.id || (req as any).user?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    const activeCount = await HandoverManager.getActiveHandoverCount(clientId);
    const activeHandovers = await HandoverManager.getActiveHandovers(clientId);

    // Calculate urgency breakdown
    const urgencyBreakdown = {
      critical: activeHandovers.filter((h) => h.urgencyScore >= 9).length,
      high: activeHandovers.filter((h) => h.urgencyScore >= 7 && h.urgencyScore < 9).length,
      medium: activeHandovers.filter((h) => h.urgencyScore >= 5 && h.urgencyScore < 7).length,
      low: activeHandovers.filter((h) => h.urgencyScore < 5).length,
    };

    return res.json({
      success: true,
      data: {
        activeCount,
        urgencyBreakdown,
      },
    });
  } catch (error) {
    console.error('Get handover stats error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get handover stats',
      },
    });
  }
});

export default router;
