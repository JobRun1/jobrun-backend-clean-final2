import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/response';
import { ERROR_CODES, HTTP_STATUS } from '../utils/constants';

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', error);

  // Zod validation errors
  if (error instanceof ZodError) {
    sendError(
      res,
      ERROR_CODES.VALIDATION_ERROR,
      'Validation failed',
      HTTP_STATUS.BAD_REQUEST,
      { errors: error.errors }
    );
    return;
  }

  // Default error
  sendError(
    res,
    ERROR_CODES.INTERNAL_ERROR,
    error.message || 'Internal server error',
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  );
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(
    res,
    ERROR_CODES.NOT_FOUND,
    `Route ${req.method} ${req.path} not found`,
    HTTP_STATUS.NOT_FOUND
  );
}
