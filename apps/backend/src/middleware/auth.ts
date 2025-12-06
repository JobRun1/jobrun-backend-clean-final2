import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types/express';
import { sendError } from '../utils/response';
import { ERROR_CODES, HTTP_STATUS } from '../utils/constants';
import { env } from '../env';

/**
 * JWT authentication middleware
 * Verifies token and attaches user to request
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(
        res,
        ERROR_CODES.UNAUTHORIZED,
        'No token provided',
        HTTP_STATUS.UNAUTHORIZED
      );
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
      clientId?: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    sendError(
      res,
      ERROR_CODES.UNAUTHORIZED,
      'Invalid or expired token',
      HTTP_STATUS.UNAUTHORIZED
    );
  }
}

/**
 * Require CLIENT role middleware
 */
export function requireClient(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    if (!req.user) {
      sendError(
        res,
        ERROR_CODES.UNAUTHORIZED,
        'Authentication required',
        HTTP_STATUS.UNAUTHORIZED
      );
      return;
    }

    if (req.user.role !== 'CLIENT') {
      sendError(
        res,
        ERROR_CODES.FORBIDDEN,
        'Client access required',
        HTTP_STATUS.FORBIDDEN
      );
      return;
    }

    next();
  } catch (error) {
    sendError(
      res,
      ERROR_CODES.UNAUTHORIZED,
      'Client verification failed',
      HTTP_STATUS.UNAUTHORIZED
    );
  }
}
