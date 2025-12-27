/**
 * TIER 2: BILLING UTILITIES
 *
 * Single source of truth for billing state logic.
 * Replaces scattered `paymentActive` checks with explicit state machine.
 *
 * ⚠️ DO NOT UPDATE billing.status DIRECTLY
 * ⚠️ Use transitionBillingState() from billingTransitions.ts ONLY
 *
 * This file provides READ-ONLY utilities for checking billing state.
 * For MUTATING billing state, use billingTransitions.ts.
 */

import { BillingStatus, PaymentSource, Client, ClientBilling, ClientControls } from '@prisma/client';
import { prisma } from '../db';

/**
 * Type for Client with billing relation included
 */
export type ClientWithBilling = Client & {
  billing?: ClientBilling | null;
  controls?: ClientControls | null;
};

/**
 * Determines if client has valid payment for accessing the system
 *
 * Valid states:
 * - TRIAL_ACTIVE: 7-day trial running
 * - ACTIVE: Paying customer
 *
 * Invalid states:
 * - TRIAL_PENDING: Onboarding not complete
 * - TRIAL_EXPIRED: Trial ended, no payment
 * - DELINQUENT: Payment failed, grace period
 * - CANCELED: Explicitly canceled
 * - SUSPENDED: Admin/system suspended
 */
export function isPaymentValid(status: BillingStatus): boolean {
  const validStatuses: BillingStatus[] = [
    BillingStatus.TRIAL_ACTIVE,
    BillingStatus.ACTIVE,
  ];
  return validStatuses.includes(status);
}

/**
 * Check if client can access paid features
 *
 * Loads billing if not already included.
 */
export async function canAccessFeatures(clientId: string): Promise<boolean> {
  const billing = await prisma.clientBilling.findUnique({
    where: { clientId },
  });

  if (!billing) {
    console.error(`[Billing] No billing record for client ${clientId}`);
    return false;
  }

  return isPaymentValid(billing.status);
}

/**
 * Human-readable billing status display
 */
export function getBillingStatusDisplay(status: BillingStatus): string {
  const displays: Record<BillingStatus, string> = {
    [BillingStatus.TRIAL_PENDING]: 'Trial Pending (Onboarding Incomplete)',
    [BillingStatus.TRIAL_ACTIVE]: '7-Day Trial Active',
    [BillingStatus.TRIAL_EXPIRED]: 'Trial Expired',
    [BillingStatus.ACTIVE]: 'Active Subscription',
    [BillingStatus.DELINQUENT]: 'Payment Failed (Grace Period)',
    [BillingStatus.CANCELED]: 'Canceled',
    [BillingStatus.SUSPENDED]: 'Suspended',
  };

  return displays[status] || 'Unknown Status';
}

/**
 * Get human-readable reasons why client is blocked
 *
 * Returns empty array if client has access.
 */
export function getBlockedReasons(
  billing: ClientBilling | null,
  controls: ClientControls | null
): string[] {
  const reasons: string[] = [];

  if (!billing) {
    reasons.push('No billing record found');
    return reasons;
  }

  // Check billing status
  if (!isPaymentValid(billing.status)) {
    reasons.push(`Billing status: ${getBillingStatusDisplay(billing.status)}`);
  }

  // Check kill switches
  if (controls?.outboundPaused) {
    reasons.push(`Outbound SMS paused: ${controls.outboundPausedReason || 'No reason provided'}`);
  }

  if (controls?.aiDisabled) {
    reasons.push(`AI disabled: ${controls.aiDisabledReason || 'No reason provided'}`);
  }

  return reasons;
}

/**
 * Determine if trial has expired
 *
 * Used by cron job to move TRIAL_ACTIVE → TRIAL_EXPIRED
 */
export function isTrialExpired(billing: ClientBilling): boolean {
  if (!billing.trialEndsAt) return false;
  return new Date() > billing.trialEndsAt;
}

/**
 * Calculate days remaining in trial
 */
export function getDaysRemainingInTrial(billing: ClientBilling): number | null {
  if (!billing.trialEndsAt) return null;

  const now = new Date();
  const diff = billing.trialEndsAt.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return Math.max(0, days);
}
