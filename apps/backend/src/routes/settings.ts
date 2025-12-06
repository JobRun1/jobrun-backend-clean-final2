import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { prisma } from '../db';
import { sendSuccess, sendError } from '../utils/response';
import { ERROR_CODES, HTTP_STATUS } from '../utils/constants';
import { AuthenticatedRequest } from '../types/express';

const router = Router();

// Apply authentication to all settings routes
router.use(authenticate);

/**
 * GET /api/settings/:clientId
 * Get client settings including theme
 */
router.get('/:clientId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clientId } = req.params;

    // Verify user has access to this client
    if (req.user?.clientId && req.user.clientId !== clientId && req.user?.role !== 'ADMIN') {
      sendError(res, ERROR_CODES.UNAUTHORIZED, 'Unauthorized', HTTP_STATUS.UNAUTHORIZED);
      return;
    }

    let settings = await prisma.clientSettings.findUnique({
      where: { clientId },
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await prisma.clientSettings.create({
        data: {
          clientId,
        },
      });
    }

    sendSuccess(res, settings);
  } catch (error) {
    console.error('Failed to fetch client settings:', error);
    sendError(
      res,
      ERROR_CODES.INTERNAL_ERROR,
      'Failed to fetch settings',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * PUT /api/settings/:clientId
 * Update client settings
 */
router.put('/:clientId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const { businessName, services, availability, pricing, phoneNumber, email, website, serviceArea, theme, metadata } = req.body;

    // Verify user has access to this client
    if (req.user?.clientId && req.user.clientId !== clientId && req.user?.role !== 'ADMIN') {
      sendError(res, ERROR_CODES.UNAUTHORIZED, 'Unauthorized', HTTP_STATUS.UNAUTHORIZED);
      return;
    }

    // Get or create settings
    let settings = await prisma.clientSettings.findUnique({
      where: { clientId },
    });

    if (!settings) {
      settings = await prisma.clientSettings.create({
        data: { clientId },
      });
    }

    // Update settings
    const updatedSettings = await prisma.clientSettings.update({
      where: { clientId },
      data: {
        ...(businessName !== undefined && { businessName }),
        ...(services !== undefined && { services }),
        ...(availability !== undefined && { availability }),
        ...(pricing !== undefined && { pricing }),
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(email !== undefined && { email }),
        ...(website !== undefined && { website }),
        ...(serviceArea !== undefined && { serviceArea }),
        ...(theme !== undefined && { theme }),
        ...(metadata !== undefined && { metadata }),
      },
    });

    sendSuccess(res, updatedSettings);
  } catch (error) {
    console.error('Failed to update client settings:', error);
    sendError(
      res,
      ERROR_CODES.INTERNAL_ERROR,
      'Failed to update settings',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * PUT /api/settings/:clientId/theme
 * Update only theme settings
 */
router.put('/:clientId/theme', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const { theme } = req.body;

    // Verify user has access to this client
    if (req.user?.clientId && req.user.clientId !== clientId && req.user?.role !== 'ADMIN') {
      sendError(res, ERROR_CODES.UNAUTHORIZED, 'Unauthorized', HTTP_STATUS.UNAUTHORIZED);
      return;
    }

    if (!theme) {
      sendError(res, ERROR_CODES.INVALID_INPUT, 'Theme is required', HTTP_STATUS.BAD_REQUEST);
      return;
    }

    // Validate theme structure
    if (!theme.id || !theme.name || !theme.colors) {
      sendError(
        res,
        ERROR_CODES.INVALID_INPUT,
        'Invalid theme structure',
        HTTP_STATUS.BAD_REQUEST
      );
      return;
    }

    // Get or create settings
    let settings = await prisma.clientSettings.findUnique({
      where: { clientId },
    });

    if (!settings) {
      settings = await prisma.clientSettings.create({
        data: { clientId },
      });
    }

    // Update theme
    const updatedSettings = await prisma.clientSettings.update({
      where: { clientId },
      data: {
        theme,
      },
    });

    sendSuccess(res, updatedSettings);
  } catch (error) {
    console.error('Failed to update theme:', error);
    sendError(
      res,
      ERROR_CODES.INTERNAL_ERROR,
      'Failed to update theme',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * DELETE /api/settings/:clientId/theme
 * Reset theme to default
 */
router.delete('/:clientId/theme', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clientId } = req.params;

    // Verify user has access to this client
    if (req.user?.clientId && req.user.clientId !== clientId && req.user?.role !== 'ADMIN') {
      sendError(res, ERROR_CODES.UNAUTHORIZED, 'Unauthorized', HTTP_STATUS.UNAUTHORIZED);
      return;
    }

    const updatedSettings = await prisma.clientSettings.update({
      where: { clientId },
      data: {
        theme: Prisma.DbNull,
      },
    });

    sendSuccess(res, updatedSettings);
  } catch (error) {
    console.error('Failed to reset theme:', error);
    sendError(
      res,
      ERROR_CODES.INTERNAL_ERROR,
      'Failed to reset theme',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

export default router;
