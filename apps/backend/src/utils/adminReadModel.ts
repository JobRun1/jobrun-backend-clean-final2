/**
 * PHASE 5: ADMIN READ MODEL
 *
 * Provides operators with single-query visibility into client operational state.
 *
 * This is a READ-ONLY model that aggregates data from:
 * - Client (identity)
 * - ClientBilling (billing state)
 * - ClientControls (operational controls + alert state)
 * - OnboardingState (onboarding progress)
 *
 * DESIGN PRINCIPLES:
 * - No writes, only reads
 * - Single query for complete operational picture
 * - Decouples admin UI from schema changes
 */

import { prisma } from '../db';
import { BillingStatus, PaymentSource, OnboardingStateEnum } from '@prisma/client';

/**
 * Complete operational state for a single client.
 *
 * Everything an operator needs to see in one object.
 */
export interface ClientOperationalState {
  // Identity
  clientId: string;
  businessName: string;
  phoneNumber: string | null;
  twilioNumber: string | null;
  createdAt: Date;

  // Billing State
  billingStatus: BillingStatus;
  paymentSource: PaymentSource;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  subscriptionStartedAt: Date | null;
  subscriptionEndsAt: Date | null;
  lastBillingEventType: string | null;
  lastBillingEventAt: Date | null;

  // Onboarding State
  onboardingState: OnboardingStateEnum | null;
  onboardingCompletedAt: Date | null;
  stuckDetectedAt: Date | null;

  // Controls (Kill Switches)
  outboundPaused: boolean;
  outboundPausedAt: Date | null;
  outboundPausedReason: string | null;
  aiDisabled: boolean;
  aiDisabledAt: Date | null;
  aiDisabledReason: string | null;

  // Ops Alerts (Phase 5: Moved to ClientControls)
  opsAlertsMuted: boolean;
  paymentGateAlertedAt: Date | null;
  paymentGateAlertCount: number;

  // Stripe Integration
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

/**
 * Get complete operational state for a single client.
 *
 * @param clientId - Client ID to query
 * @returns ClientOperationalState or null if client not found
 */
export async function getClientOperationalState(
  clientId: string
): Promise<ClientOperationalState | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      billing: true,
      controls: true,
      onboardingState: true,
    },
  });

  if (!client) {
    return null;
  }

  return {
    // Identity
    clientId: client.id,
    businessName: client.businessName,
    phoneNumber: client.phoneNumber,
    twilioNumber: client.twilioNumber,
    createdAt: client.createdAt,

    // Billing State
    billingStatus: client.billing?.status || BillingStatus.TRIAL_PENDING,
    paymentSource: client.billing?.paymentSource || PaymentSource.NONE,
    trialStartedAt: client.billing?.trialStartedAt || null,
    trialEndsAt: client.billing?.trialEndsAt || null,
    subscriptionStartedAt: client.billing?.subscriptionStartedAt || null,
    subscriptionEndsAt: client.billing?.subscriptionEndsAt || null,
    lastBillingEventType: client.billing?.lastBillingEventType || null,
    lastBillingEventAt: client.billing?.lastBillingEventAt || null,

    // Onboarding State
    onboardingState: client.onboardingState?.currentState || null,
    onboardingCompletedAt: client.onboardingState?.completedAt || null,
    stuckDetectedAt: client.onboardingState?.stuckDetectedAt || null,

    // Controls (Kill Switches)
    outboundPaused: client.controls?.outboundPaused || false,
    outboundPausedAt: client.controls?.outboundPausedAt || null,
    outboundPausedReason: client.controls?.outboundPausedReason || null,
    aiDisabled: client.controls?.aiDisabled || false,
    aiDisabledAt: client.controls?.aiDisabledAt || null,
    aiDisabledReason: client.controls?.aiDisabledReason || null,

    // Ops Alerts (Phase 5: Moved to ClientControls)
    opsAlertsMuted: client.controls?.opsAlertsMuted || false,
    paymentGateAlertedAt: client.controls?.paymentGateAlertedAt || null,
    paymentGateAlertCount: client.controls?.paymentGateAlertCount || 0,

    // Stripe Integration
    stripeCustomerId: client.billing?.stripeCustomerId || null,
    stripeSubscriptionId: client.billing?.stripeSubscriptionId || null,
  };
}

/**
 * List all clients with their operational state.
 *
 * @returns Array of ClientOperationalState for all clients
 */
export async function listClientOperationalStates(): Promise<ClientOperationalState[]> {
  const clients = await prisma.client.findMany({
    include: {
      billing: true,
      controls: true,
      onboardingState: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return clients.map((client) => ({
    // Identity
    clientId: client.id,
    businessName: client.businessName,
    phoneNumber: client.phoneNumber,
    twilioNumber: client.twilioNumber,
    createdAt: client.createdAt,

    // Billing State
    billingStatus: client.billing?.status || BillingStatus.TRIAL_PENDING,
    paymentSource: client.billing?.paymentSource || PaymentSource.NONE,
    trialStartedAt: client.billing?.trialStartedAt || null,
    trialEndsAt: client.billing?.trialEndsAt || null,
    subscriptionStartedAt: client.billing?.subscriptionStartedAt || null,
    subscriptionEndsAt: client.billing?.subscriptionEndsAt || null,
    lastBillingEventType: client.billing?.lastBillingEventType || null,
    lastBillingEventAt: client.billing?.lastBillingEventAt || null,

    // Onboarding State
    onboardingState: client.onboardingState?.currentState || null,
    onboardingCompletedAt: client.onboardingState?.completedAt || null,
    stuckDetectedAt: client.onboardingState?.stuckDetectedAt || null,

    // Controls (Kill Switches)
    outboundPaused: client.controls?.outboundPaused || false,
    outboundPausedAt: client.controls?.outboundPausedAt || null,
    outboundPausedReason: client.controls?.outboundPausedReason || null,
    aiDisabled: client.controls?.aiDisabled || false,
    aiDisabledAt: client.controls?.aiDisabledAt || null,
    aiDisabledReason: client.controls?.aiDisabledReason || null,

    // Ops Alerts (Phase 5: Moved to ClientControls)
    opsAlertsMuted: client.controls?.opsAlertsMuted || false,
    paymentGateAlertedAt: client.controls?.paymentGateAlertedAt || null,
    paymentGateAlertCount: client.controls?.paymentGateAlertCount || 0,

    // Stripe Integration
    stripeCustomerId: client.billing?.stripeCustomerId || null,
    stripeSubscriptionId: client.billing?.stripeSubscriptionId || null,
  }));
}

/**
 * Get summary statistics for operators.
 *
 * @returns Aggregate statistics across all clients
 */
export async function getOperationalSummary(): Promise<{
  totalClients: number;
  byBillingStatus: Record<BillingStatus, number>;
  byPaymentSource: Record<PaymentSource, number>;
  activeTrials: number;
  pausedClients: number;
  mutedClients: number;
  stuckInOnboarding: number;
}> {
  const [
    totalClients,
    billingGroups,
    paymentSourceGroups,
    controlsStats,
    stuckClients,
  ] = await Promise.all([
    // Total clients
    prisma.client.count(),

    // Group by billing status
    prisma.clientBilling.groupBy({
      by: ['status'],
      _count: true,
    }),

    // Group by payment source
    prisma.clientBilling.groupBy({
      by: ['paymentSource'],
      _count: true,
    }),

    // Controls statistics
    prisma.clientControls.aggregate({
      _count: {
        outboundPaused: true,
        opsAlertsMuted: true,
      },
    }),

    // Stuck in onboarding
    prisma.onboardingState.count({
      where: {
        stuckDetectedAt: { not: null },
        completedAt: null,
      },
    }),
  ]);

  // Convert billing status groups to record
  const byBillingStatus: Record<BillingStatus, number> = {
    TRIAL_PENDING: 0,
    TRIAL_ACTIVE: 0,
    TRIAL_EXPIRED: 0,
    ACTIVE: 0,
    DELINQUENT: 0,
    CANCELED: 0,
    SUSPENDED: 0,
  };
  billingGroups.forEach((group) => {
    byBillingStatus[group.status] = group._count;
  });

  // Convert payment source groups to record
  const byPaymentSource: Record<PaymentSource, number> = {
    NONE: 0,
    STRIPE: 0,
    MANUAL: 0,
    WAIVED: 0,
  };
  paymentSourceGroups.forEach((group) => {
    byPaymentSource[group.paymentSource] = group._count;
  });

  return {
    totalClients,
    byBillingStatus,
    byPaymentSource,
    activeTrials: byBillingStatus.TRIAL_ACTIVE,
    pausedClients: controlsStats._count.outboundPaused || 0,
    mutedClients: controlsStats._count.opsAlertsMuted || 0,
    stuckInOnboarding: stuckClients,
  };
}
