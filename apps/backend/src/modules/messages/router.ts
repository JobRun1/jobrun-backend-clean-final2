import { findOrCreateCustomer } from '../customer/service';
import { findOrCreateConversation, addMessage } from '../conversation/service';
import { sendSMS } from '../../twilio/client';
import { logger } from '../../utils/logger';
import { MessageDirection, MessageType } from '@prisma/client';
import { sendOnboardingSms } from '../../utils/onboardingSms';

/**
 * Route inbound SMS message
 */
export async function routeInboundSMS(params: {
  clientId: string;
  from: string;
  to: string;
  body: string;
  twilioSid: string;
}): Promise<void> {
  try {
    logger.info('Routing inbound SMS', {
      from: params.from,
      to: params.to,
      clientId: params.clientId,
    });

    // 1. Find or create customer
    const customer = await findOrCreateCustomer(params.clientId, params.from);

    // 2. Find or create conversation thread
    const conversation = await findOrCreateConversation(params.clientId, customer.id);

    // 3. Save inbound message
    await addMessage({
      conversationId: conversation.id,
      clientId: params.clientId,
      customerId: customer.id,
      direction: MessageDirection.INBOUND,
      type: MessageType.SMS,
      body: params.body,
      twilioSid: params.twilioSid,
    });

    // 4. Send placeholder auto-response
    const responseBody = 'Thanks for your message — JobRun Phase 2 router active.';

    const twilioSid = await sendSMS(params.from, params.to, responseBody);

    // 5. Save outbound message
    await addMessage({
      conversationId: conversation.id,
      clientId: params.clientId,
      customerId: customer.id,
      direction: MessageDirection.OUTBOUND,
      type: MessageType.SMS,
      body: responseBody,
      twilioSid,
    });

    logger.info('Routed inbound SMS successfully', {
      customerId: customer.id,
      conversationId: conversation.id,
    });
  } catch (error) {
    logger.error('Error routing inbound SMS', error as Error);
    throw error;
  }
}

/**
 * Route missed call event
 */
export async function routeMissedCall(params: {
  clientId: string;
  from: string;
  to: string;
  callSid: string;
  callStatus: string;
}): Promise<void> {
  try {
    logger.info('Routing missed call', {
      from: params.from,
      to: params.to,
      clientId: params.clientId,
      callStatus: params.callStatus,
    });

    // 1. Find or create customer
    const customer = await findOrCreateCustomer(params.clientId, params.from);

    // 2. Find or create conversation thread
    const conversation = await findOrCreateConversation(params.clientId, customer.id);

    // 3. Add system message about missed call
    await addMessage({
      conversationId: conversation.id,
      clientId: params.clientId,
      customerId: customer.id,
      direction: MessageDirection.SYSTEM,
      type: MessageType.CALL,
      body: `Missed call from ${params.from}`,
      metadata: {
        callSid: params.callSid,
        callStatus: params.callStatus,
      },
    });

    // 4. Send canonical onboarding SMS for missed call
    const twilioSid = await sendOnboardingSms(params.from, params.to);

    // 5. Save outbound SMS message to database
    const { ONBOARDING_MESSAGE } = await import('../../utils/onboardingSms');
    await addMessage({
      conversationId: conversation.id,
      clientId: params.clientId,
      customerId: customer.id,
      direction: MessageDirection.OUTBOUND,
      type: MessageType.SMS,
      body: ONBOARDING_MESSAGE,
      twilioSid,
    });

    logger.info('Routed missed call successfully', {
      customerId: customer.id,
      conversationId: conversation.id,
    });
  } catch (error) {
    logger.error('Error routing missed call', error as Error);
    throw error;
  }
}

/**
 * Get conversation history for a customer
 */
export async function getConversationHistory(customerId: string) {
  const { getCustomerConversations } = await import('../conversation/service');
  return getCustomerConversations(customerId);
}
