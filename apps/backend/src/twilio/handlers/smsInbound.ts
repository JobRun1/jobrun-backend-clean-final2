import { Request, Response } from 'express';
import { TwilioSMSPayload } from '../utils/twilioTypes';
import { logger } from '../../utils/logger';
import { prisma } from '../../db';
import { findOrCreateCustomer } from '../../modules/customer/service';
import { findOrCreateConversation, addMessage } from '../../modules/conversation/service';
import { sendSMS } from '../client';
import { MessageDirection, MessageType } from '@prisma/client';

/**
 * Handle inbound SMS from Twilio - Simplified version
 */
export async function handleInboundSMS(req: Request, res: Response): Promise<void> {
  try {
    const payload: TwilioSMSPayload = req.body;

    logger.info('📥 [SMS INBOUND] Received inbound SMS', {
      from: payload.From,
      to: payload.To,
      body: payload.Body?.substring(0, 100),
    });

    // Extract client ID from request (you'll need to implement your client routing logic)
    const clientId = req.headers['x-client-id'] as string || 'default-client-id';

    // Find or create customer
    const customer = await findOrCreateCustomer(clientId, payload.From);

    // Find or create conversation
    const conversation = await findOrCreateConversation(clientId, customer.id);

    // Save incoming message
    await addMessage({
      conversationId: conversation.id,
      clientId: clientId,
      customerId: customer.id,
      direction: MessageDirection.INBOUND,
      type: MessageType.SMS,
      body: payload.Body || '',
      twilioSid: payload.MessageSid,
    });

    logger.info('✅ [SMS INBOUND] Message saved to database');

    // Send auto-response (customize this based on your business logic)
    const autoResponse = `Thank you for your message! We'll get back to you shortly.`;

    await sendSMS(payload.From, payload.To, autoResponse);

    logger.info('📤 [SMS INBOUND] Sent auto-response');

    // Respond to Twilio with 200 OK
    res.status(200).send('OK');
  } catch (error) {
    logger.error('❌ [SMS INBOUND] Error handling inbound SMS:', error instanceof Error ? error : { error });
    res.status(500).send('Error processing SMS');
  }
}
