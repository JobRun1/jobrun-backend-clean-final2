import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { prisma } from '../../db';
import { findOrCreateCustomer } from '../../modules/customer/service';
import { findOrCreateConversation, addMessage } from '../../modules/conversation/service';
import { MessageDirection, MessageType } from '@prisma/client';

/**
 * Handle inbound voice call from Twilio - Simplified version
 */
export async function handleInboundVoice(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body;

    logger.info('📞 [VOICE INBOUND] Received inbound call', {
      from: payload.From,
      to: payload.To,
      callSid: payload.CallSid,
    });

    // Extract client ID from request
    const clientId = req.headers['x-client-id'] as string || 'default-client-id';

    // Find or create customer
    const customer = await findOrCreateCustomer(clientId, payload.From);

    // Find or create conversation
    const conversation = await findOrCreateConversation(clientId, customer.id);

    // Log the call
    await addMessage({
      conversationId: conversation.id,
      clientId: clientId,
      customerId: customer.id,
      direction: MessageDirection.INBOUND,
      type: MessageType.CALL,
      body: `Inbound call from ${payload.From}`,
      twilioSid: payload.CallSid,
    });

    logger.info('✅ [VOICE INBOUND] Call logged to database');

    // Respond with TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling. Please leave a message after the beep.</Say>
  <Record maxLength="120" transcribe="true" />
  <Say>Thank you. Goodbye.</Say>
</Response>`;

    res.type('text/xml').send(twiml);
  } catch (error) {
    logger.error('❌ [VOICE INBOUND] Error handling inbound call:', error instanceof Error ? error : { error });

    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">We're sorry, but we're unable to process your call at this time. Please try again later.</Say>
  <Hangup />
</Response>`;

    res.type('text/xml').send(errorTwiml);
  }
}
