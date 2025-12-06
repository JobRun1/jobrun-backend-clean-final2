import { Request, Response } from 'express';
import { TwilioCallStatusPayload } from '../utils/twilioTypes';
import { routeMissedCall } from '../../modules/messages/router';
import { logger } from '../../utils/logger';
import { prisma } from '../../db';

/**
 * Handle call status updates from Twilio
 */
export async function handleCallStatus(req: Request, res: Response): Promise<void> {
  try {
    const payload: TwilioCallStatusPayload = req.body;

    logger.info('Received call status update', {
      from: payload.From,
      to: payload.To,
      callSid: payload.CallSid,
      callStatus: payload.CallStatus,
    });

    // Find which client this number belongs to
    const client = await prisma.client.findFirst({
      where: { phoneNumber: payload.To },
    });

    if (!client) {
      logger.warn('No client found for phone number', { phoneNumber: payload.To });
      res.status(404).send('Client not found');
      return;
    }

    // Handle missed call statuses
    const missedCallStatuses = ['no-answer', 'busy', 'failed', 'canceled'];

    if (missedCallStatuses.includes(payload.CallStatus)) {
      logger.info('Detected missed call', {
        from: payload.From,
        callStatus: payload.CallStatus,
      });

      await routeMissedCall({
        clientId: client.id,
        from: payload.From,
        to: payload.To,
        callSid: payload.CallSid,
        callStatus: payload.CallStatus,
      });
    }

    // Respond to Twilio
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error handling call status', error as Error);
    res.status(500).send('Internal server error');
  }
}
