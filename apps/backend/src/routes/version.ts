import { Router } from 'express';
import { sendSuccess } from '../utils/response';
import { VersionResponse } from '../shared/types';
import { APP_NAME, APP_VERSION } from '../utils/constants';

const router = Router();

/**
 * GET /version
 * Version information endpoint
 */
router.get('/', (req, res) => {
  const response: VersionResponse = {
    name: APP_NAME,
    version: APP_VERSION,
  };

  sendSuccess(res, response);
});

export default router;
