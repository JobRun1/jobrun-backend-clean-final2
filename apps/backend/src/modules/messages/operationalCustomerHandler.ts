/**
 * OPERATIONAL CUSTOMER REPLY HANDLER
 *
 * This file handles inbound SMS from customers who:
 * 1. Called an operational client's Twilio number
 * 2. Received a customer job-intake SMS
 * 3. Are now replying with job details
 *
 * IMPORTANT: This is NOT for onboarding. Operational conversations only.
 */

import { prisma } from '../../db';
import { logger } from '../../utils/logger';
import { sendSMS } from '../../twilio/client';
import { addMessage } from '../conversation/service';
import { metrics, MetricConversationInvariantViolationHandler } from '../../services/Metrics';
import { MessageDirection, MessageType } from '@prisma/client';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPE DEFINITIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type JobUrgency = 'LOW' | 'MEDIUM' | 'HIGH';
type JobTimeframe = 'IMMEDIATE' | 'TODAY' | 'THIS_WEEK' | 'FUTURE' | 'UNKNOWN';

interface ParsedJobRequest {
  jobSummary: string;
  urgency: JobUrgency;
  timeframe: JobTimeframe;
  hasJobInfo: boolean;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONVERSATION GUARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * @deprecated DEPRECATED - DO NOT USE
 *
 * This function has been replaced with explicit conversation.mode checks.
 * Use `conversation.mode === 'OPERATIONAL'` instead.
 *
 * OLD BEHAVIOR (HEURISTIC - BRITTLE):
 * - Checked message content to infer conversation type
 * - Required SYSTEM/CALL message + OUTBOUND SMS
 * - Unreliable and unsafe for production
 *
 * NEW BEHAVIOR (EXPLICIT - SAFE):
 * - Check conversation.mode field directly
 * - Set once at creation time
 * - Never inferred from messages
 *
 * This function is kept for backwards compatibility only.
 */
export async function isOperationalConversation(conversationId: string): Promise<boolean> {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    select: { direction: true, type: true, body: true },
    orderBy: { createdAt: 'asc' },
  });

  // Check for SYSTEM/CALL message (missed call)
  const hasMissedCall = messages.some(
    (m) => m.direction === 'SYSTEM' && m.type === 'CALL'
  );

  // Check for OUTBOUND SMS (job-intake message)
  const hasJobIntakeSms = messages.some(
    (m) =>
      m.direction === 'OUTBOUND' &&
      m.type === 'SMS' &&
      m.body.includes('You just tried to reach')
  );

  return hasMissedCall && hasJobIntakeSms;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// JOB PARSING LOGIC (HEURISTIC-BASED, NO AI)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Parse customer reply into structured job request
 *
 * Uses keywords and heuristics (NO AI)
 */
export function parseJobRequest(messageBody: string): ParsedJobRequest {
  const text = messageBody.trim().toLowerCase();

  // Check if message is too short or vague
  const hasJobInfo = text.length >= 10 && !isVagueResponse(text);

  // Extract urgency
  const urgency = detectUrgency(text);

  // Extract timeframe
  const timeframe = detectTimeframe(text);

  // Use original message as job summary (preserve capitalization)
  const jobSummary = messageBody.trim();

  return {
    jobSummary,
    urgency,
    timeframe,
    hasJobInfo,
  };
}

/**
 * Detect if message is vague or uninformative
 */
function isVagueResponse(text: string): boolean {
  const vaguePatterns = [
    /^(yes|no|ok|okay|sure|hi|hello|hey)$/,
    /^(thanks|thank you|cheers)$/,
    /^(\?+|\.+|!+)$/,
  ];

  return vaguePatterns.some((pattern) => pattern.test(text));
}

/**
 * Detect urgency from keywords
 */
function detectUrgency(text: string): JobUrgency {
  const urgentKeywords = [
    'emergency',
    'urgent',
    'asap',
    'immediately',
    'now',
    'flooding',
    'leak',
    'broken',
    'burst',
    'no water',
    'no heating',
  ];

  const mediumKeywords = ['today', 'this morning', 'this afternoon', 'tonight'];

  if (urgentKeywords.some((keyword) => text.includes(keyword))) {
    return 'HIGH';
  }

  if (mediumKeywords.some((keyword) => text.includes(keyword))) {
    return 'MEDIUM';
  }

  return 'LOW';
}

/**
 * Detect timeframe from keywords
 */
function detectTimeframe(text: string): JobTimeframe {
  if (
    /\b(now|immediately|asap|right now|right away)\b/.test(text) ||
    text.includes('emergency')
  ) {
    return 'IMMEDIATE';
  }

  if (
    /\b(today|this morning|this afternoon|tonight|this evening)\b/.test(text)
  ) {
    return 'TODAY';
  }

  if (/\b(this week|next few days|soon)\b/.test(text)) {
    return 'THIS_WEEK';
  }

  if (
    /\b(next week|next month|future|sometime|eventually|no rush)\b/.test(text)
  ) {
    return 'FUTURE';
  }

  return 'UNKNOWN';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DECISION MATRIX
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Main operational customer reply handler
 *
 * DECISION MATRIX:
 * - Missing job info → Ask follow-up question
 * - Clear + non-urgent → Send booking link
 * - Clear + urgent → Alert client immediately
 */
export async function handleOperationalCustomerReply(params: {
  conversationId: string;
  clientId: string;
  customerId: string;
  customerPhone: string;
  messageBody: string;
  twilioSid: string;
  correlationId?: string; // Optional for backward compatibility
}): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔀 OPERATIONAL SMS RECEIVED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📥 Customer reply details:', {
    conversationId: params.conversationId,
    clientId: params.clientId,
    customerId: params.customerId,
    messagePreview: params.messageBody.slice(0, 50),
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // INVARIANT: Conversation MUST be OPERATIONAL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const conversation = await prisma.conversation.findUnique({
    where: { id: params.conversationId },
    select: { mode: true },
  });

  if (!conversation) {
    console.error('❌ INVARIANT VIOLATION: Conversation not found', {
      conversationId: params.conversationId,
    });
    throw new Error(`Conversation ${params.conversationId} not found`);
  }

  if (conversation.mode !== 'OPERATIONAL') {
    // Increment metric for alerting
    metrics.increment(MetricConversationInvariantViolationHandler, {
      actualMode: conversation.mode,
      expectedMode: 'OPERATIONAL',
    });

    // Structured log with correlation ID
    const logContext = params.correlationId
      ? { correlationId: params.correlationId, timestamp: new Date().toISOString() }
      : { timestamp: new Date().toISOString() };

    console.error('❌ INVARIANT VIOLATION: Non-operational conversation reached operational handler', {
      ...logContext,
      invariantName: 'handler.mode_check',
      conversationId: params.conversationId,
      actualMode: conversation.mode,
      expectedMode: 'OPERATIONAL',
      clientId: params.clientId,
      customerId: params.customerId,
    });

    throw new Error(
      `Conversation ${params.conversationId} has mode ${conversation.mode}, expected OPERATIONAL`
    );
  }

  console.log('✅ Invariant check passed: conversation is OPERATIONAL');

  // 1. Parse the job request
  const parsed = parseJobRequest(params.messageBody);

  console.log('📊 Parsed job request:', {
    jobSummary: parsed.jobSummary.slice(0, 50),
    urgency: parsed.urgency,
    timeframe: parsed.timeframe,
    hasJobInfo: parsed.hasJobInfo,
  });

  // 2. Fetch client and customer data
  const client = await prisma.client.findUnique({
    where: { id: params.clientId },
    select: {
      id: true,
      businessName: true,
      phoneNumber: true,
      twilioNumber: true,
    },
  });

  if (!client) {
    throw new Error(`Client ${params.clientId} not found`);
  }

  // NOTE: bookingUrl field doesn't exist in ClientSettings yet
  // For now, we'll skip the booking link path
  const clientSettings = null;

  // 3. DECISION MATRIX
  if (!parsed.hasJobInfo) {
    // PATH 1: Ask for more details
    console.log('📊 Decision: UNCLEAR → ASK_FOR_DETAILS');
    await handleUnclearJob(params, client);
  } else if (parsed.urgency === 'HIGH' || parsed.timeframe === 'IMMEDIATE') {
    // PATH 2: Urgent job → Alert client
    console.log('📊 Decision: URGENT → ALERT_CLIENT');
    await handleUrgentJob(params, client, parsed);
  } else {
    // PATH 3: Non-urgent → Send booking link (DISABLED - bookingUrl field doesn't exist)
    console.log('📊 Decision: NON_URGENT → ALERT_CLIENT (booking link disabled)');
    await handleUrgentJob(params, client, parsed);
  }

  console.log('✅ Operational customer reply handled successfully');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DECISION PATH HANDLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * PATH 1: Unclear job → Ask for more details
 */
async function handleUnclearJob(
  params: {
    conversationId: string;
    clientId: string;
    customerId: string;
    customerPhone: string;
  },
  client: { businessName: string; twilioNumber: string | null }
): Promise<void> {
  const followUpMessage = `Thanks for reaching out to ${client.businessName}.

Could you give us a bit more detail about the job?

For example:
• What needs doing?
• When do you need it done?

This helps us help you faster 👍`;

  console.log('📤 Sending follow-up question to customer');

  const twilioSid = await sendSMS(
    params.customerPhone,
    client.twilioNumber || process.env.TWILIO_NUMBER!,
    followUpMessage
  );

  await addMessage({
    conversationId: params.conversationId,
    clientId: params.clientId,
    customerId: params.customerId,
    direction: MessageDirection.OUTBOUND,
    type: MessageType.SMS,
    body: followUpMessage,
    twilioSid,
  });

  console.log('✅ Follow-up question sent');
}

/**
 * PATH 2: Urgent job → Alert client immediately
 */
async function handleUrgentJob(
  params: {
    conversationId: string;
    clientId: string;
    customerId: string;
    customerPhone: string;
  },
  client: {
    businessName: string;
    phoneNumber: string | null;
    twilioNumber: string | null;
  },
  parsed: ParsedJobRequest
): Promise<void> {
  // 1. Notify client
  if (client.phoneNumber) {
    const clientNotification = `🚨 URGENT job request:

"${parsed.jobSummary}"

Customer wants: ${parsed.timeframe}
From: ${params.customerPhone}

Reply YES to accept or NO to decline.`;

    console.log('📤 Sending urgent job alert to client:', client.phoneNumber);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🚨 FORENSIC LOGGING - Identify alert spam source
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.error('🚨🚨🚨 TWILIO SEND EXECUTED FROM:', __filename);
    console.error('🚨 STACK TRACE:', new Error().stack);
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    await sendSMS(
      client.phoneNumber,
      client.twilioNumber || process.env.TWILIO_NUMBER!,
      clientNotification
    );

    console.log('✅ Client notified of urgent job');
  } else {
    console.warn('⚠️ Client has no phone number - cannot send urgent alert');
  }

  // 2. Confirm to customer
  const customerConfirmation = `We've received your urgent request and are notifying ${client.businessName} now.

They'll be in touch shortly.

Thank you 👍`;

  console.log('📤 Sending confirmation to customer');

  const twilioSid = await sendSMS(
    params.customerPhone,
    client.twilioNumber || process.env.TWILIO_NUMBER!,
    customerConfirmation
  );

  await addMessage({
    conversationId: params.conversationId,
    clientId: params.clientId,
    customerId: params.customerId,
    direction: MessageDirection.OUTBOUND,
    type: MessageType.SMS,
    body: customerConfirmation,
    twilioSid,
  });

  console.log('✅ Customer confirmation sent');
}

/**
 * PATH 3: Non-urgent job → Send booking link
 */
async function handleNonUrgentJob(
  params: {
    conversationId: string;
    clientId: string;
    customerId: string;
    customerPhone: string;
  },
  client: { businessName: string; twilioNumber: string | null },
  clientSettings: { bookingUrl: string | null } | null,
  parsed: ParsedJobRequest
): Promise<void> {
  let bookingMessage: string;

  if (clientSettings?.bookingUrl) {
    bookingMessage = `Thanks for the details about "${parsed.jobSummary}".

You can book directly here:
${clientSettings.bookingUrl}

Or we'll be in touch soon to confirm.`;
  } else {
    bookingMessage = `Thanks for the details about "${parsed.jobSummary}".

We've noted this down and ${client.businessName} will be in touch to confirm timing.

Thank you 👍`;
  }

  console.log('📤 Sending booking confirmation to customer');

  const twilioSid = await sendSMS(
    params.customerPhone,
    client.twilioNumber || process.env.TWILIO_NUMBER!,
    bookingMessage
  );

  await addMessage({
    conversationId: params.conversationId,
    clientId: params.clientId,
    customerId: params.customerId,
    direction: MessageDirection.OUTBOUND,
    type: MessageType.SMS,
    body: bookingMessage,
    twilioSid,
  });

  console.log('✅ Booking message sent');
}
