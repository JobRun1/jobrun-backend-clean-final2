import { Router } from 'express';
import { sendSuccess } from '../utils/response';
import { testDatabaseConnection } from '../db';
import { HealthResponse } from '../shared/types';

const router = Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', async (req, res, next) => {
  try {
    const dbConnected = await testDatabaseConnection();

    const response: HealthResponse = {
      status: dbConnected ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'connected' : 'disconnected',
    };

    sendSuccess(res, response);
  } catch (error) {
    next(error);
  }
});

export default router;
