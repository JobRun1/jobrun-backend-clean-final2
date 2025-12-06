import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { sendError } from '../utils/response';
import { ERROR_CODES, HTTP_STATUS } from '../utils/constants';

/**
 * Admin role verification middleware
 * Ensures the authenticated user has ADMIN role
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // Check if user is authenticated
    if (!req.user) {
      sendError(
        res,
        ERROR_CODES.UNAUTHORIZED,
        'Authentication required',
        HTTP_STATUS.UNAUTHORIZED
      );
      return;
    }

    // Check if user has ADMIN role
    if (req.user.role !== 'ADMIN') {
      sendError(
        res,
        ERROR_CODES.FORBIDDEN,
        'Admin access required',
        HTTP_STATUS.FORBIDDEN
      );
      return;
    }

    next();
  } catch (error) {
    sendError(
      res,
      ERROR_CODES.UNAUTHORIZED,
      'Admin verification failed',
      HTTP_STATUS.UNAUTHORIZED
    );
  }
}

/**
 * Check if request is in impersonation mode
 */
export function checkImpersonation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const impersonationHeader = req.headers['x-admin-impersonation'];

  if (impersonationHeader) {
    req.isImpersonating = true;
    req.impersonationToken = impersonationHeader as string;
  }

  next();
}
