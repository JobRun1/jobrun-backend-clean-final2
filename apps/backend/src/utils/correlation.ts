/**
 * Correlation ID Utility
 *
 * Manages request correlation IDs for distributed tracing.
 * Uses Twilio's request ID when available, generates UUID otherwise.
 */

import { randomUUID } from 'crypto';
import { Request } from 'express';

/**
 * Extract or generate correlation ID from request
 *
 * Priority:
 * 1. X-Twilio-Request-Id header (Twilio webhooks)
 * 2. X-Request-Id header (standard)
 * 3. Generate new UUID
 */
export function getCorrelationId(req: Request): string {
  const twilioRequestId = req.headers['x-twilio-request-id'];
  const standardRequestId = req.headers['x-request-id'];

  if (twilioRequestId && typeof twilioRequestId === 'string') {
    return twilioRequestId;
  }

  if (standardRequestId && typeof standardRequestId === 'string') {
    return standardRequestId;
  }

  return randomUUID();
}

/**
 * Build structured log context with correlation ID
 */
export function buildLogContext(
  correlationId: string,
  context: Record<string, any>
): Record<string, any> {
  return {
    correlationId,
    timestamp: new Date().toISOString(),
    ...context,
  };
}
