import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import { sendSuccess, sendError } from '../utils/response';
import { ERROR_CODES, HTTP_STATUS } from '../utils/constants';

const router = Router();

/**
 * GET /api/customers/:clientId
 * Get all customers for a client
 */
router.get('/:clientId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clientId } = req.params;

    // Verify user has access to this client
    if (req.user?.role !== 'ADMIN' && req.user?.clientId !== clientId) {
      sendError(res, ERROR_CODES.FORBIDDEN, 'Access denied', HTTP_STATUS.FORBIDDEN);
      return;
    }

    const customers = await prisma.customer.findMany({
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

    sendSuccess(res, { customers });
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    sendError(res, ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch customers', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

export default router;
