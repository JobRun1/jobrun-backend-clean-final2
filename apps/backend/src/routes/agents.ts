import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import { sendSuccess, sendError } from '../utils/response';
import { ERROR_CODES, HTTP_STATUS } from '../utils/constants';

const router = Router();

/**
 * POST /api/agents/settings/update
 * Update agent settings for a client
 */
router.post('/settings/update', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clientId, agentName, enabled } = req.body;

    // Verify user has access to this client
    if (req.user?.role !== 'ADMIN' && req.user?.clientId !== clientId) {
      sendError(res, ERROR_CODES.FORBIDDEN, 'Access denied', HTTP_STATUS.FORBIDDEN);
      return;
    }

    if (!clientId || !agentName || typeof enabled !== 'boolean') {
      sendError(res, ERROR_CODES.VALIDATION_ERROR, 'Missing required fields', HTTP_STATUS.BAD_REQUEST);
      return;
    }

    // Get or create client settings
    let settings = await prisma.clientSettings.findUnique({
      where: { clientId },
    });

    if (!settings) {
      // Create default settings if they don't exist
      settings = await prisma.clientSettings.create({
        data: {
          clientId,
          agentSettings: {},
        },
      });
    }

    // Update agent settings
    const currentAgentSettings = (settings.agentSettings as Record<string, any>) || {};
    currentAgentSettings[agentName] = { enabled };

    const updatedSettings = await prisma.clientSettings.update({
      where: { clientId },
      data: {
        agentSettings: currentAgentSettings,
      },
    });

    sendSuccess(res, { settings: updatedSettings });
  } catch (error) {
    console.error('Failed to update agent settings:', error);
    sendError(res, ERROR_CODES.INTERNAL_ERROR, 'Failed to update agent settings', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * GET /api/agents/settings/:clientId
 * Get agent settings for a client
 */
router.get('/settings/:clientId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clientId } = req.params;

    // Verify user has access to this client
    if (req.user?.role !== 'ADMIN' && req.user?.clientId !== clientId) {
      sendError(res, ERROR_CODES.FORBIDDEN, 'Access denied', HTTP_STATUS.FORBIDDEN);
      return;
    }

    const settings = await prisma.clientSettings.findUnique({
      where: { clientId },
    });

    if (!settings) {
      sendSuccess(res, { agentSettings: {} });
      return;
    }

    sendSuccess(res, { agentSettings: settings.agentSettings || {} });
  } catch (error) {
    console.error('Failed to fetch agent settings:', error);
    sendError(res, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch agent settings', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

export default router;
