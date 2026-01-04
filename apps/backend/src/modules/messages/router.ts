import { findOrCreateCustomer } from '../customer/service';
import { findOrCreateConversation, addMessage } from '../conversation/service';
import { sendSMS } from '../../twilio/client';
import { logger } from '../../utils/logger';
import { MessageDirection, MessageType } from '@prisma/client';
import { sendCustomerMissedCallSms } from '../../utils/onboardingSms';
import { prisma } from '../../db';

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
 *
 * IMPORTANT: This function is for OPERATIONAL clients only.
 * It sends a customer-facing missed call SMS, NOT an onboarding SMS.
 */
export async function routeMissedCall(params: {
  clientId: string;
  from: string;
  to: string;
  callSid: string;
  callStatus: string;
}): Promise<void> {
  try {
    logger.info('🔄 [OPERATIONAL] Routing missed call for existing client', {
      from: params.from,
      to: params.to,
      clientId: params.clientId,
      callStatus: params.callStatus,
      flow: 'CUSTOMER_MISSED_CALL',
    });

    // 1. Fetch client to get business name
    const client = await prisma.client.findUnique({
      where: { id: params.clientId },
      select: { id: true, businessName: true, twilioNumber: true },
    });

    if (!client) {
      throw new Error(`Client ${params.clientId} not found`);
    }

    logger.info('✅ [OPERATIONAL] Client found', {
      clientId: client.id,
      businessName: client.businessName,
    });

    // 2. Find or create customer
    const customer = await findOrCreateCustomer(params.clientId, params.from);

    // 3. Find or create conversation thread (OPERATIONAL mode - customer job flow)
    const conversation = await findOrCreateConversation(params.clientId, customer.id, 'OPERATIONAL');

    // 4. Add system message about missed call
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

    // 5. Send CUSTOMER-FACING missed call SMS (NOT onboarding SMS)
    logger.info('📤 [OPERATIONAL] Sending customer missed call SMS', {
      to: params.from,
      from: params.to,
      businessName: client.businessName,
    });

    const { sid: twilioSid, body: messageBody } = await sendCustomerMissedCallSms(
      params.from,
      params.to,
      client.businessName
    );

    // 6. Save outbound SMS message to database
    await addMessage({
      conversationId: conversation.id,
      clientId: params.clientId,
      customerId: customer.id,
      direction: MessageDirection.OUTBOUND,
      type: MessageType.SMS,
      body: messageBody,
      twilioSid,
    });

    logger.info('✅ [OPERATIONAL] Routed missed call successfully', {
      customerId: customer.id,
      conversationId: conversation.id,
      smsType: 'CUSTOMER_MISSED_CALL',
    });
  } catch (error) {
    logger.error('❌ [OPERATIONAL] Error routing missed call', error as Error);
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
