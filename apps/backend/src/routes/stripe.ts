/**
 * TIER 3 PHASE 4: STRIPE WEBHOOK INTEGRATION (LAW-BOUND)
 *
 * This module integrates Stripe webhooks with the billing state machine.
 * It is a SIGNAL PROCESSOR, not a state controller.
 *
 * CORE PRINCIPLES:
 * - Stripe events NEVER mutate billing.status directly
 * - All transitions go through transitionBillingState()
 * - All events are idempotent via BillingEvent table
 * - Invalid/out-of-order events are ignored safely
 * - Failures are logged but non-fatal
 *
 * ⚠️ DO NOT UPDATE billing.status DIRECTLY
 * ⚠️ Use transitionBillingState() from billingTransitions.ts ONLY
 *
 * REQUIRED ENV VARS:
 * - STRIPE_SECRET_KEY: sk_test_... or sk_live_...
 * - STRIPE_WEBHOOK_SECRET: whsec_... (from Stripe Dashboard)
 */

import express from 'express';
import Stripe from 'stripe';
import { prisma } from '../db';
import { BillingStatus, PaymentSource } from '@prisma/client';
import {
  transitionBillingState,
  activateSubscription,
  markDelinquent,
  cancelSubscription,
} from '../utils/billingTransitions';

const router = express.Router();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!STRIPE_SECRET_KEY) {
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('❌ CRITICAL: STRIPE_SECRET_KEY not configured');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('Payment processing will NOT work until this is set.');
  console.error('Add to .env: STRIPE_SECRET_KEY=sk_test_...');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

if (!STRIPE_WEBHOOK_SECRET) {
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('❌ CRITICAL: STRIPE_WEBHOOK_SECRET not configured');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('Webhook verification will FAIL until this is set.');
  console.error('Get from Stripe Dashboard → Webhooks → Add endpoint → Signing secret');
  console.error('Add to .env: STRIPE_WEBHOOK_SECRET=whsec_...');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Initialize Stripe SDK
const stripe = new Stripe(STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  STRIPE → BILLING TRANSITION MAP (CANONICAL)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Defines valid Stripe event → billing state transitions.
 *
 * Each row specifies:
 * - Stripe event type
 * - Allowed current billing states
 * - Target billing state after successful processing
 *
 * Events received when client is in a disallowed state are IGNORED (logged but not processed).
 */
interface StripeEventTransitionRule {
  eventType: string;
  allowedCurrentStates: BillingStatus[];
  targetState: BillingStatus;
  description: string;
}

const STRIPE_TRANSITION_MAP: StripeEventTransitionRule[] = [
  {
    eventType: 'checkout.session.completed',
    allowedCurrentStates: [BillingStatus.TRIAL_ACTIVE, BillingStatus.TRIAL_EXPIRED],
    targetState: BillingStatus.ACTIVE,
    description: 'Customer completed checkout and paid successfully',
  },
  {
    eventType: 'invoice.payment_succeeded',
    allowedCurrentStates: [BillingStatus.DELINQUENT],
    targetState: BillingStatus.ACTIVE,
    description: 'Payment recovered after failure',
  },
  {
    eventType: 'invoice.payment_failed',
    allowedCurrentStates: [BillingStatus.ACTIVE],
    targetState: BillingStatus.DELINQUENT,
    description: 'Payment failed, entering grace period',
  },
  {
    eventType: 'customer.subscription.deleted',
    allowedCurrentStates: [BillingStatus.ACTIVE, BillingStatus.DELINQUENT],
    targetState: BillingStatus.CANCELED,
    description: 'Subscription explicitly canceled by customer or Stripe',
  },
];

/**
 * Get transition rule for a given Stripe event type.
 */
function getTransitionRule(eventType: string): StripeEventTransitionRule | null {
  return STRIPE_TRANSITION_MAP.find((rule) => rule.eventType === eventType) || null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  IDEMPOTENCY LAYER (BILLING EVENT LOG)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Check if Stripe event has already been processed.
 *
 * @param stripeEventId - Stripe event ID (e.g., evt_123...)
 * @returns true if event has been processed, false otherwise
 */
async function isEventAlreadyProcessed(stripeEventId: string): Promise<boolean> {
  const existingEvent = await prisma.billingEvent.findUnique({
    where: { stripeEventId },
  });
  return !!existingEvent;
}

/**
 * Record Stripe event processing in BillingEvent table.
 *
 * This ensures idempotency - duplicate events won't be processed twice.
 *
 * @param clientId - Client ID
 * @param stripeEventId - Stripe event ID
 * @param eventType - Stripe event type
 * @param eventData - Optional event payload for debugging
 * @param processingTimeMs - Time taken to process event
 */
async function recordBillingEvent(
  clientId: string,
  stripeEventId: string,
  eventType: string,
  eventData?: any,
  processingTimeMs?: number
): Promise<void> {
  try {
    await prisma.billingEvent.create({
      data: {
        clientId,
        stripeEventId,
        eventType,
        eventData: eventData || {},
        processedAt: new Date(),
        processingTimeMs: processingTimeMs || null,
      },
    });
    console.log(`[Stripe] ✅ Recorded billing event: ${stripeEventId}`);
  } catch (error) {
    // If unique constraint fails, event was already recorded (race condition)
    // This is safe to ignore - idempotency is preserved
    if (error instanceof Error && error.message.includes('unique constraint')) {
      console.log(`[Stripe] ℹ️  Event ${stripeEventId} already recorded (race condition)`);
    } else {
      // Other errors are concerning but shouldn't block webhook processing
      console.error(`[Stripe] ⚠️  Failed to record billing event ${stripeEventId}:`, error);
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CLIENT RESOLUTION (FROM STRIPE METADATA)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Extract client ID from Stripe event.
 *
 * Tries multiple strategies in order:
 * 1. metadata.client_id (preferred)
 * 2. metadata.phone_number (legacy fallback)
 *
 * @param event - Stripe event object
 * @returns clientId or null if not found
 */
async function resolveClientId(event: Stripe.Event): Promise<string | null> {
  // Strategy 1: Direct client_id in metadata
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const clientId = session.metadata?.client_id;
    if (clientId) {
      return clientId;
    }

    // Fallback: phone_number lookup (legacy)
    const phoneNumber = session.metadata?.phone_number;
    if (phoneNumber) {
      const client = await prisma.client.findFirst({
        where: { phoneNumber },
      });
      return client?.id || null;
    }
  }

  // Strategy 2: Invoice events (subscription-based)
  if (event.type.startsWith('invoice.')) {
    const invoice = event.data.object as Stripe.Invoice;
    // Invoice.subscription can be string | Subscription | null
    const subscription = (invoice as any).subscription;
    const subscriptionId = typeof subscription === 'string'
      ? subscription
      : subscription?.id;

    if (subscriptionId) {
      // Look up client by stripeSubscriptionId
      const billing = await prisma.clientBilling.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
      });
      return billing?.clientId || null;
    }
  }

  // Strategy 3: Subscription events
  if (event.type.startsWith('customer.subscription.')) {
    const subscription = event.data.object as Stripe.Subscription;
    const billing = await prisma.clientBilling.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });
    return billing?.clientId || null;
  }

  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  EVENT HANDLERS (TRANSITION EXECUTORS)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Handle checkout.session.completed event.
 *
 * Triggered when customer completes checkout and payment succeeds.
 *
 * HARDENING: RISK 1 - METADATA TRUST
 * - Only activates if billing.paymentSource === STRIPE
 * - Rejects untrusted metadata activation attempts
 * - Stripe confirms contracts, it does not define them
 *
 * ACTIONS:
 * - Transition TRIAL_ACTIVE/TRIAL_EXPIRED → ACTIVE
 * - Store Stripe customer ID and subscription ID
 * - Set subscriptionStartedAt timestamp
 */
async function handleCheckoutCompleted(
  clientId: string,
  session: Stripe.Checkout.Session
): Promise<void> {
  console.log(`[Stripe] Processing checkout.session.completed for client ${clientId}`);
  console.log(`[Stripe] Session: ${session.id}, Customer: ${session.customer}, Subscription: ${session.subscription}`);

  // GUARD: Load billing record to verify payment source
  const billing = await prisma.clientBilling.findUnique({
    where: { clientId },
  });

  if (!billing) {
    console.error(`[Stripe] 🚫 REJECTED: No billing record for client ${clientId}`);
    console.error(`[Stripe] Session ${session.id} will be IGNORED`);
    return;
  }

  // CRITICAL: Verify client has Stripe as payment source
  // This prevents metadata spoofing attacks where someone creates a checkout
  // with another client's ID and activates their account
  if (billing.paymentSource !== PaymentSource.STRIPE) {
    console.error(`[Stripe] 🚫 REJECTED: Client ${clientId} paymentSource is ${billing.paymentSource}, not STRIPE`);
    console.error(`[Stripe] Session ${session.id} metadata activation attempt BLOCKED`);
    console.error(`[Stripe] Stripe may CONFIRM contracts, it may NOT DEFINE them`);
    return;
  }

  console.log(`[Stripe] ✅ Verified paymentSource=STRIPE for client ${clientId}`);

  // Update Stripe metadata in ClientBilling
  try {
    await prisma.clientBilling.update({
      where: { clientId },
      data: {
        stripeCustomerId: session.customer as string || null,
        stripeSubscriptionId: session.subscription as string || null,
        paymentSource: PaymentSource.STRIPE, // Ensure it stays STRIPE
      },
    });
    console.log(`[Stripe] ✅ Updated Stripe metadata for client ${clientId}`);
  } catch (error) {
    console.error(`[Stripe] ⚠️  Failed to update Stripe metadata:`, error);
    // Continue processing - metadata update is not critical for state transition
  }

  // Execute billing state transition
  const result = await activateSubscription(
    clientId,
    `Stripe: checkout.session.completed (${session.id})`
  );

  if (result.success) {
    console.log(`[Stripe] ✅ Subscription activated: ${result.fromStatus} → ${result.toStatus}`);
  } else {
    console.error(`[Stripe] ❌ Failed to activate subscription:`, result.error);
  }
}

/**
 * Handle invoice.payment_succeeded event.
 *
 * Triggered when recurring payment succeeds.
 *
 * HARDENING: RISK 2 - SEMANTIC DUPLICATES
 * - Ignores first invoice if checkout.session.completed just processed
 * - Prevents double-activation from semantically identical events
 * - 60-second deduplication window for checkout → invoice sequence
 *
 * ACTIONS:
 * - Transition DELINQUENT → ACTIVE (payment recovered)
 */
async function handleInvoicePaymentSucceeded(
  clientId: string,
  invoice: Stripe.Invoice
): Promise<void> {
  console.log(`[Stripe] Processing invoice.payment_succeeded for client ${clientId}`);
  console.log(`[Stripe] Invoice: ${invoice.id}, Amount: ${invoice.amount_paid / 100} ${invoice.currency}`);

  // GUARD: Load billing record to check for semantic duplicates
  const billing = await prisma.clientBilling.findUnique({
    where: { clientId },
  });

  if (!billing) {
    console.error(`[Stripe] 🚫 REJECTED: No billing record for client ${clientId}`);
    return;
  }

  // CRITICAL: Detect semantic duplicate
  // If checkout.session.completed was processed in the last 60 seconds,
  // this invoice.payment_succeeded is likely the same business intent
  if (billing.lastBillingEventType?.includes('checkout.session.completed')) {
    const secondsSinceLastEvent = billing.lastBillingEventAt
      ? (Date.now() - billing.lastBillingEventAt.getTime()) / 1000
      : Infinity;

    if (secondsSinceLastEvent < 60) {
      console.log(`[Stripe] ⏭️  SEMANTIC DUPLICATE: invoice.payment_succeeded ignored`);
      console.log(`[Stripe] Last event: ${billing.lastBillingEventType} (${secondsSinceLastEvent.toFixed(1)}s ago)`);
      console.log(`[Stripe] This invoice is likely from the same checkout - SAFE IGNORE`);
      return;
    }
  }

  const result = await activateSubscription(
    clientId,
    `Stripe: invoice.payment_succeeded (${invoice.id})`
  );

  if (result.success) {
    console.log(`[Stripe] ✅ Payment recovered: ${result.fromStatus} → ${result.toStatus}`);
  } else {
    console.error(`[Stripe] ❌ Failed to recover payment:`, result.error);
  }
}

/**
 * Handle invoice.payment_failed event.
 *
 * Triggered when recurring payment fails.
 *
 * ACTIONS:
 * - Transition ACTIVE → DELINQUENT (enter grace period)
 */
async function handleInvoicePaymentFailed(
  clientId: string,
  invoice: Stripe.Invoice
): Promise<void> {
  console.log(`[Stripe] Processing invoice.payment_failed for client ${clientId}`);
  console.log(`[Stripe] Invoice: ${invoice.id}, Attempt: ${invoice.attempt_count}`);

  const result = await markDelinquent(
    clientId,
    `Stripe: invoice.payment_failed (${invoice.id}, attempt ${invoice.attempt_count})`
  );

  if (result.success) {
    console.log(`[Stripe] ✅ Marked delinquent: ${result.fromStatus} → ${result.toStatus}`);
  } else {
    console.error(`[Stripe] ❌ Failed to mark delinquent:`, result.error);
  }
}

/**
 * Handle customer.subscription.deleted event.
 *
 * Triggered when subscription is canceled or expires.
 *
 * HARDENING: RISK 3 - OVER-EAGER CANCELLATION
 * - Only cancels if it's the client's current subscription
 * - Ignores deletion of old/replaced subscriptions
 * - Prevents accidental cancellation during subscription changes
 *
 * ACTIONS:
 * - Transition ACTIVE/DELINQUENT → CANCELED
 * - Set subscriptionEndsAt timestamp
 */
async function handleSubscriptionDeleted(
  clientId: string,
  subscription: Stripe.Subscription
): Promise<void> {
  console.log(`[Stripe] Processing customer.subscription.deleted for client ${clientId}`);
  console.log(`[Stripe] Subscription: ${subscription.id}, Status: ${subscription.status}`);

  // GUARD: Load billing record to verify this is the current subscription
  const billing = await prisma.clientBilling.findUnique({
    where: { clientId },
  });

  if (!billing) {
    console.error(`[Stripe] 🚫 REJECTED: No billing record for client ${clientId}`);
    return;
  }

  // CRITICAL: Only cancel if this is the client's CURRENT subscription
  // Prevents accidental cancellation when:
  // - Subscription is upgraded/downgraded (old subscription deleted, new one created)
  // - Subscription is replaced due to payment method change
  // - Multiple subscriptions exist and one is removed
  if (billing.stripeSubscriptionId !== subscription.id) {
    console.log(`[Stripe] ⏭️  IGNORED: Subscription ${subscription.id} is NOT the current subscription`);
    console.log(`[Stripe] Current subscription: ${billing.stripeSubscriptionId}`);
    console.log(`[Stripe] This is likely an old/replaced subscription - SAFE IGNORE`);
    return;
  }

  // GUARD: Check cancellation reason
  // Stripe sets canceled_at when subscription is explicitly canceled
  // If it's just expiring naturally (end of period), we might not want to cancel immediately
  if (!subscription.canceled_at && subscription.status !== 'canceled') {
    console.log(`[Stripe] ⏭️  IGNORED: Subscription ${subscription.id} status=${subscription.status}, not explicitly canceled`);
    console.log(`[Stripe] This might be a temporary deletion - will wait for explicit cancellation`);
    return;
  }

  console.log(`[Stripe] ✅ Verified this is current subscription and explicitly canceled`);

  const result = await cancelSubscription(
    clientId,
    `Stripe: customer.subscription.deleted (${subscription.id}, status=${subscription.status})`
  );

  if (result.success) {
    console.log(`[Stripe] ✅ Subscription canceled: ${result.fromStatus} → ${result.toStatus}`);
  } else {
    console.error(`[Stripe] ❌ Failed to cancel subscription:`, result.error);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  EVENT INTAKE LAYER (FIREWALL)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Process a verified Stripe event.
 *
 * This is the main entry point for all Stripe webhook processing.
 *
 * FLOW:
 * 1. Check idempotency (BillingEvent table)
 * 2. Resolve client ID from event metadata
 * 3. Load current billing state
 * 4. Validate transition is allowed
 * 5. Route to event-specific handler
 * 6. Record event in BillingEvent table
 *
 * SAFETY GUARANTEES:
 * - Idempotent: duplicate events are ignored
 * - Validated: invalid transitions are rejected
 * - Non-fatal: errors are logged but don't block webhook acknowledgement
 */
async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  const startTime = Date.now();
  const { id: eventId, type: eventType } = event;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`[Stripe] Processing event: ${eventType}`);
  console.log(`[Stripe] Event ID: ${eventId}`);
  console.log(`[Stripe] Created: ${new Date(event.created * 1000).toISOString()}`);

  // GUARD 1: Check idempotency
  const alreadyProcessed = await isEventAlreadyProcessed(eventId);
  if (alreadyProcessed) {
    console.log(`[Stripe] ⏭️  Event ${eventId} already processed (idempotent NO-OP)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return;
  }

  // GUARD 2: Resolve client ID
  const clientId = await resolveClientId(event);
  if (!clientId) {
    console.error(`[Stripe] ❌ Could not resolve client ID from event ${eventId}`);
    console.error(`[Stripe] Event type: ${eventType}`);
    console.error(`[Stripe] This event will be IGNORED (not retried)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return;
  }

  console.log(`[Stripe] Resolved client ID: ${clientId}`);

  // GUARD 3: Load current billing state
  const billing = await prisma.clientBilling.findUnique({
    where: { clientId },
  });

  if (!billing) {
    console.error(`[Stripe] ❌ No billing record for client ${clientId}`);
    console.error(`[Stripe] This event will be IGNORED (not retried)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return;
  }

  console.log(`[Stripe] Current billing status: ${billing.status}`);

  // GUARD 4: Get transition rule
  const rule = getTransitionRule(eventType);
  if (!rule) {
    console.log(`[Stripe] ℹ️  Unhandled event type: ${eventType} (ignored)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return;
  }

  // GUARD 5: Validate current state is allowed
  if (!rule.allowedCurrentStates.includes(billing.status)) {
    console.log(`[Stripe] ⏭️  Event ${eventType} received in invalid state: ${billing.status}`);
    console.log(`[Stripe] Allowed states: [${rule.allowedCurrentStates.join(', ')}]`);
    console.log(`[Stripe] This is SAFE - event ignored, state unchanged`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Still record the event to maintain idempotency
    await recordBillingEvent(clientId, eventId, eventType, event.data.object);
    return;
  }

  console.log(`[Stripe] ✅ Transition allowed: ${billing.status} → ${rule.targetState}`);

  // EXECUTE: Route to event-specific handler
  try {
    if (eventType === 'checkout.session.completed') {
      await handleCheckoutCompleted(clientId, event.data.object as Stripe.Checkout.Session);
    } else if (eventType === 'invoice.payment_succeeded') {
      await handleInvoicePaymentSucceeded(clientId, event.data.object as Stripe.Invoice);
    } else if (eventType === 'invoice.payment_failed') {
      await handleInvoicePaymentFailed(clientId, event.data.object as Stripe.Invoice);
    } else if (eventType === 'customer.subscription.deleted') {
      await handleSubscriptionDeleted(clientId, event.data.object as Stripe.Subscription);
    }

    const processingTime = Date.now() - startTime;
    console.log(`[Stripe] ✅ Event processed successfully in ${processingTime}ms`);

    // Record event in BillingEvent table (idempotency)
    await recordBillingEvent(clientId, eventId, eventType, event.data.object, processingTime);
  } catch (error) {
    console.error(`[Stripe] ❌ Error processing event ${eventId}:`, error);
    // Still record the event to prevent retry loops
    await recordBillingEvent(clientId, eventId, eventType, event.data.object);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HTTP ROUTE HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * POST /api/webhooks/stripe
 *
 * Receives Stripe webhook events.
 *
 * SECURITY:
 * - Validates Stripe signature to prevent spoofing
 * - Returns 400 for invalid signatures
 * - Returns 500 for configuration errors
 * - Returns 200 to acknowledge receipt (even on processing errors)
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  // GUARD: Check if Stripe is configured
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    console.error('[Stripe] Webhook rejected: Stripe not configured');
    return res.status(500).json({
      error: 'Stripe not configured',
      message: 'STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be set',
    });
  }

  // GUARD: Check for signature header
  const sig = req.headers['stripe-signature'];
  if (!sig) {
    console.error('[Stripe] Webhook rejected: No signature header');
    return res.status(400).json({
      error: 'No signature',
      message: 'Missing stripe-signature header',
    });
  }

  let event: Stripe.Event;

  try {
    // CRITICAL: Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('[Stripe] Webhook signature verification FAILED:', error);
    return res.status(400).json({
      error: 'Invalid signature',
      message: error instanceof Error ? error.message : 'Signature verification failed',
    });
  }

  // Process event asynchronously (don't block webhook response)
  handleStripeEvent(event).catch((error) => {
    console.error('[Stripe] Unhandled error in handleStripeEvent:', error);
  });

  // Return 200 immediately to acknowledge receipt
  // This prevents Stripe from retrying while we process the event
  res.status(200).json({ received: true, event_id: event.id });
});

export default router;
