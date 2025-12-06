import { Response } from 'express';
import { ApiResponse } from '../shared/types';
import { createSuccessResponse, createErrorResponse } from '../shared/utils';
import { HTTP_STATUS } from './constants';

/**
 * Send a success response
 */
export function sendSuccess<T>(res: Response, data: T, statusCode: number = HTTP_STATUS.OK): void {
  const response = createSuccessResponse(data);
  res.status(statusCode).json(response);
}

/**
 * Send an error response
 */
export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  details?: Record<string, unknown>
): void {
  const response = createErrorResponse(code, message, details);
  res.status(statusCode).json(response);
}
