import { Router } from 'express';
import { prisma } from '../db';
import { sendSuccess, sendError } from '../utils/response';
import { verifyImpersonationToken, isTokenExpired } from '../utils/jwt';

const router = Router();

// GET /api/impersonate/validate?token=XYZ
router.get('/validate', async (req, res) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      return sendError(res, 'MISSING_TOKEN', 'Impersonation token is required', 400);
    }

    // Verify JWT signature
    const decoded = verifyImpersonationToken(token);

    if (!decoded) {
      return sendError(res, 'INVALID_TOKEN', 'Invalid or malformed impersonation token', 401);
    }

    // Check expiration
    if (isTokenExpired(decoded)) {
      return sendError(res, 'TOKEN_EXPIRED', 'Impersonation token has expired', 401);
    }

    // Load client data
    const client = await prisma.client.findUnique({
      where: { id: decoded.clientId },
      select: {
        id: true,
        businessName: true,
        region: true,
        phoneNumber: true,
        twilioNumber: true,
        timezone: true,
        _count: {
          select: {
            customers: true,
            messages: true,
            bookings: true
          }
        }
      }
    });

    if (!client) {
      return sendError(res, 'CLIENT_NOT_FOUND', 'Client no longer exists', 404);
    }

    sendSuccess(res, {
      clientId: decoded.clientId,
      adminId: decoded.adminId,
      client
    });
  } catch (error) {
    console.error('Failed to validate impersonation token:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to validate impersonation token', 500);
  }
});

export default router;
