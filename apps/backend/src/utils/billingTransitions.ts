/**
 * TIER 3 PHASE 2: BILLING STATE TRANSITION ENGINE (CANONICAL LAW)
 *
 * This module defines the ONLY valid way to mutate billing.status.
 * All state transitions MUST go through transitionBillingState().
 *
 * ⚠️ DO NOT UPDATE billing.status DIRECTLY ANYWHERE IN THE CODEBASE
 * ⚠️ Use transitionBillingState() ONLY
 *
 * DESIGN PRINCIPLES:
 * - Atomic transitions (succeed completely or fail completely)
 * - Audit trail for every state change
 * - Validation prevents invalid transitions
 * - Idempotent (transitioning to current state is no-op)
 * - Explicit reasons required for all transitions
 */

import { prisma } from "../db";
import { BillingStatus, PaymentSource } from "@prisma/client";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  STATE TRANSITION GRAPH (CANONICAL)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Valid state transitions.
 *
 * Key: Current state
 * Value: Array of valid next states
 *
 * RULES:
 * - TRIAL_PENDING → TRIAL_ACTIVE (onboarding complete + payment confirmed)
 * - TRIAL_ACTIVE → TRIAL_EXPIRED (7 days passed, no payment)
 * - TRIAL_ACTIVE → ACTIVE (subscription started during trial)
 * - TRIAL_EXPIRED → ACTIVE (payment confirmed after trial expired)
 * - ACTIVE → DELINQUENT (payment failed)
 * - DELINQUENT → ACTIVE (payment recovered)
 * - DELINQUENT → CANCELED (grace period expired or explicit cancel)
 * - ACTIVE → CANCELED (explicit cancellation)
 * - ANY → SUSPENDED (admin intervention)
 * - SUSPENDED → TRIAL_ACTIVE/ACTIVE (admin restore)
 */
const VALID_TRANSITIONS: Record<BillingStatus, BillingStatus[]> = {
  TRIAL_PENDING: [
    BillingStatus.TRIAL_ACTIVE,
    BillingStatus.SUSPENDED,
  ],
  TRIAL_ACTIVE: [
    BillingStatus.TRIAL_EXPIRED,
    BillingStatus.ACTIVE,
    BillingStatus.SUSPENDED,
  ],
  TRIAL_EXPIRED: [
    BillingStatus.ACTIVE,
    BillingStatus.CANCELED,
    BillingStatus.SUSPENDED,
  ],
  ACTIVE: [
    BillingStatus.DELINQUENT,
    BillingStatus.CANCELED,
    BillingStatus.SUSPENDED,
  ],
  DELINQUENT: [
    BillingStatus.ACTIVE,
    BillingStatus.CANCELED,
    BillingStatus.SUSPENDED,
  ],
  CANCELED: [
    BillingStatus.SUSPENDED, // Admin can suspend canceled clients for record-keeping
  ],
  SUSPENDED: [
    BillingStatus.TRIAL_ACTIVE, // Admin restore to trial
    BillingStatus.ACTIVE, // Admin restore to active
    BillingStatus.CANCELED, // Admin permanent termination
  ],
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TRANSITION RESULT TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface TransitionResult {
  success: true;
  fromStatus: BillingStatus;
  toStatus: BillingStatus;
  reason: string;
  timestamp: Date;
}

export interface TransitionError {
  success: false;
  error: string;
  fromStatus: BillingStatus;
  attemptedStatus: BillingStatus;
}

export type BillingTransitionResult = TransitionResult | TransitionError;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  VALIDATION FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Validate if transition is allowed by state machine.
 *
 * @param fromStatus - Current billing status
 * @param toStatus - Desired billing status
 * @returns true if transition is valid, false otherwise
 */
export function isValidTransition(
  fromStatus: BillingStatus,
  toStatus: BillingStatus
): boolean {
  // Idempotent: transitioning to same state is always valid (no-op)
  if (fromStatus === toStatus) {
    return true;
  }

  const allowedTransitions = VALID_TRANSITIONS[fromStatus];
  return allowedTransitions.includes(toStatus);
}

/**
 * Get human-readable error message for invalid transition.
 *
 * @param fromStatus - Current billing status
 * @param toStatus - Attempted billing status
 * @returns Error message explaining why transition is invalid
 */
export function getTransitionErrorMessage(
  fromStatus: BillingStatus,
  toStatus: BillingStatus
): string {
  if (fromStatus === toStatus) {
    return `Already in ${toStatus} state (no-op)`;
  }

  const allowedTransitions = VALID_TRANSITIONS[fromStatus];
  return `Invalid transition: ${fromStatus} → ${toStatus}. Valid transitions from ${fromStatus}: [${allowedTransitions.join(", ")}]`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ATOMIC TRANSITION FUNCTION (SINGLE SOURCE OF TRUTH)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Execute billing state transition with validation and audit logging.
 *
 * This is the ONLY function allowed to mutate billing.status.
 *
 * GUARANTEES:
 * - Atomic: Either succeeds completely or fails completely (no partial updates)
 * - Validated: Rejects invalid transitions
 * - Audited: Logs all successful transitions
 * - Idempotent: Transitioning to current state is a no-op (returns success)
 *
 * @param clientId - Client ID to transition
 * @param toStatus - Target billing status
 * @param reason - Human-readable reason for transition (required for audit trail)
 * @param metadata - Optional metadata to store with transition (e.g., stripe event ID)
 * @returns TransitionResult on success, TransitionError on failure
 *
 * @example
 * // Start trial
 * const result = await transitionBillingState(
 *   clientId,
 *   BillingStatus.TRIAL_ACTIVE,
 *   'Onboarding completed, starting 7-day trial'
 * );
 *
 * @example
 * // Payment failed
 * const result = await transitionBillingState(
 *   clientId,
 *   BillingStatus.DELINQUENT,
 *   'Stripe webhook: payment_failed',
 *   { stripeEventId: 'evt_123' }
 * );
 */
export async function transitionBillingState(
  clientId: string,
  toStatus: BillingStatus,
  reason: string,
  metadata?: Record<string, any>
): Promise<BillingTransitionResult> {
  const timestamp = new Date();

  // GUARD 1: Load current billing record
  const billing = await prisma.clientBilling.findUnique({
    where: { clientId },
  });

  if (!billing) {
    return {
      success: false,
      error: `No billing record found for client ${clientId}`,
      fromStatus: BillingStatus.TRIAL_PENDING, // Default assumption
      attemptedStatus: toStatus,
    };
  }

  const fromStatus = billing.status;

  // GUARD 2: Idempotency check (no-op if already in target state)
  if (fromStatus === toStatus) {
    console.log(`[BILLING_TRANSITION] NO-OP: Client ${clientId} already in ${toStatus} state`);
    return {
      success: true,
      fromStatus,
      toStatus,
      reason: `Already in ${toStatus} state (no-op)`,
      timestamp,
    };
  }

  // GUARD 3: Validate transition is allowed
  if (!isValidTransition(fromStatus, toStatus)) {
    const errorMessage = getTransitionErrorMessage(fromStatus, toStatus);
    console.error(`[BILLING_TRANSITION] INVALID: Client ${clientId} - ${errorMessage}`);
    return {
      success: false,
      error: errorMessage,
      fromStatus,
      attemptedStatus: toStatus,
    };
  }

  // EXECUTE TRANSITION (ATOMIC)
  try {
    await prisma.clientBilling.update({
      where: { clientId },
      data: {
        status: toStatus,
        lastBillingEventAt: timestamp,
        lastBillingEventType: reason,
      },
    });

    console.log(`[BILLING_TRANSITION] SUCCESS: Client ${clientId} - ${fromStatus} → ${toStatus}`);
    console.log(`[BILLING_TRANSITION] Reason: ${reason}`);
    if (metadata) {
      console.log(`[BILLING_TRANSITION] Metadata:`, metadata);
    }

    // Emit structured log for external monitoring/alerting
    console.log("BILLING_STATE_CHANGED", {
      clientId,
      fromStatus,
      toStatus,
      reason,
      metadata,
      timestamp: timestamp.toISOString(),
    });

    return {
      success: true,
      fromStatus,
      toStatus,
      reason,
      timestamp,
    };
  } catch (error) {
    console.error(`[BILLING_TRANSITION] ERROR: Failed to update billing for client ${clientId}:`, error);
    return {
      success: false,
      error: `Database update failed: ${error instanceof Error ? error.message : String(error)}`,
      fromStatus,
      attemptedStatus: toStatus,
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CONVENIENCE HELPERS (COMMON TRANSITIONS)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Start client's 7-day trial.
 *
 * Valid from: TRIAL_PENDING
 * Sets: trialStartedAt, trialEndsAt (7 days from now)
 */
export async function startTrial(clientId: string): Promise<BillingTransitionResult> {
  // Set trial dates
  const now = new Date();
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);

  try {
    await prisma.clientBilling.update({
      where: { clientId },
      data: {
        trialStartedAt: now,
        trialEndsAt,
        trialUsedAt: now, // Mark trial as used (prevents re-use)
      },
    });
  } catch (error) {
    console.error(`[BILLING] Failed to set trial dates for client ${clientId}:`, error);
  }

  return transitionBillingState(
    clientId,
    BillingStatus.TRIAL_ACTIVE,
    "7-day trial started"
  );
}

/**
 * Expire client's trial (7 days passed, no payment).
 *
 * Valid from: TRIAL_ACTIVE
 */
export async function expireTrial(clientId: string): Promise<BillingTransitionResult> {
  return transitionBillingState(
    clientId,
    BillingStatus.TRIAL_EXPIRED,
    "7-day trial expired, no payment"
  );
}

/**
 * Activate client subscription (payment confirmed).
 *
 * Valid from: TRIAL_ACTIVE, TRIAL_EXPIRED, DELINQUENT, SUSPENDED
 * Sets: subscriptionStartedAt
 */
export async function activateSubscription(
  clientId: string,
  reason: string = "Subscription activated"
): Promise<BillingTransitionResult> {
  // Set subscription start date if not already set
  const billing = await prisma.clientBilling.findUnique({
    where: { clientId },
  });

  if (billing && !billing.subscriptionStartedAt) {
    try {
      await prisma.clientBilling.update({
        where: { clientId },
        data: {
          subscriptionStartedAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`[BILLING] Failed to set subscription start date for client ${clientId}:`, error);
    }
  }

  return transitionBillingState(
    clientId,
    BillingStatus.ACTIVE,
    reason
  );
}

/**
 * Mark payment as delinquent (payment failed, grace period).
 *
 * Valid from: ACTIVE
 */
export async function markDelinquent(
  clientId: string,
  reason: string = "Payment failed"
): Promise<BillingTransitionResult> {
  return transitionBillingState(
    clientId,
    BillingStatus.DELINQUENT,
    reason
  );
}

/**
 * Cancel subscription (explicit cancellation or grace period expired).
 *
 * Valid from: ACTIVE, DELINQUENT, TRIAL_EXPIRED
 * Sets: subscriptionEndsAt
 */
export async function cancelSubscription(
  clientId: string,
  reason: string = "Subscription canceled"
): Promise<BillingTransitionResult> {
  // Set subscription end date
  try {
    await prisma.clientBilling.update({
      where: { clientId },
      data: {
        subscriptionEndsAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`[BILLING] Failed to set subscription end date for client ${clientId}:`, error);
  }

  return transitionBillingState(
    clientId,
    BillingStatus.CANCELED,
    reason
  );
}

/**
 * Suspend client (admin intervention).
 *
 * Valid from: ANY state
 */
export async function suspendClient(
  clientId: string,
  reason: string
): Promise<BillingTransitionResult> {
  return transitionBillingState(
    clientId,
    BillingStatus.SUSPENDED,
    reason
  );
}

/**
 * Get transition graph visualization (for debugging).
 */
export function getTransitionGraph(): Record<BillingStatus, BillingStatus[]> {
  return VALID_TRANSITIONS;
}
