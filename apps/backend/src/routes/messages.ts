import { Router } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { getCustomerConversations } from '../modules/conversation/service';
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants';

const router = Router();

/**
 * GET /api/messages/conversation/:customerId
 * Get conversation history for a customer
 */
router.get('/conversation/:customerId', async (req, res, next) => {
  try {
    const { customerId } = req.params;

    const conversations = await getCustomerConversations(customerId);

    sendSuccess(res, conversations);
  } catch (error) {
    next(error);
  }
});

export default router;
