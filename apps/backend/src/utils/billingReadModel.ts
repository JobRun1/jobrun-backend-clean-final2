/**
 * TIER 3 PHASE 3: BILLING READ MODEL (MINIMAL)
 *
 * Read-only utilities for querying billing state.
 * Provides high-level summaries for admin UI and system health checks.
 *
 * ⚠️ DO NOT UPDATE billing.status DIRECTLY
 * ⚠️ Use transitionBillingState() from billingTransitions.ts for mutations
 *
 * This file is READ-ONLY. For mutations, use billingTransitions.ts.
 */

import { prisma } from "../db";
import { BillingStatus } from "@prisma/client";
import { isPaymentValid } from "./billingUtils";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  BILLING SUMMARY TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface BillingSummary {
  clientId: string;
  status: BillingStatus;
  isBlocked: boolean;
  daysRemainingInTrial: number | null;
  lastTransition: {
    timestamp: Date | null;
    type: string | null;
  };
  recommendedAction: string;
  metadata: {
    trialStartedAt: Date | null;
    trialEndsAt: Date | null;
    subscriptionStartedAt: Date | null;
    subscriptionEndsAt: Date | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  BILLING SUMMARY QUERY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Get comprehensive billing summary for a client.
 *
 * Returns high-level view of billing state for:
 * - Admin dashboard
 * - System health checks
 * - Client status pages
 * - Debugging
 *
 * READ-ONLY: Does not mutate state.
 *
 * @param clientId - Client ID to query
 * @returns Billing summary with recommended action
 */
export async function getBillingSummary(clientId: string): Promise<BillingSummary | null> {
  const billing = await prisma.clientBilling.findUnique({
    where: { clientId },
  });

  if (!billing) {
    return null;
  }

  const now = new Date();

  // Calculate days remaining in trial
  let daysRemainingInTrial: number | null = null;
  if (billing.trialEndsAt) {
    const diff = billing.trialEndsAt.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    daysRemainingInTrial = Math.max(0, days);
  }

  // Determine if client is blocked
  const isBlocked = !isPaymentValid(billing.status);

  // Determine recommended action
  const recommendedAction = getRecommendedAction(billing, daysRemainingInTrial);

  return {
    clientId: billing.clientId,
    status: billing.status,
    isBlocked,
    daysRemainingInTrial,
    lastTransition: {
      timestamp: billing.lastBillingEventAt,
      type: billing.lastBillingEventType,
    },
    recommendedAction,
    metadata: {
      trialStartedAt: billing.trialStartedAt,
      trialEndsAt: billing.trialEndsAt,
      subscriptionStartedAt: billing.subscriptionStartedAt,
      subscriptionEndsAt: billing.subscriptionEndsAt,
      stripeCustomerId: billing.stripeCustomerId,
      stripeSubscriptionId: billing.stripeSubscriptionId,
    },
  };
}

/**
 * Determine recommended action based on billing state.
 *
 * Provides human-readable guidance for admins/clients.
 *
 * @param billing - ClientBilling record
 * @param daysRemainingInTrial - Days left in trial (if applicable)
 * @returns Recommended action string
 */
function getRecommendedAction(
  billing: {
    status: BillingStatus;
    trialEndsAt: Date | null;
    subscriptionEndsAt: Date | null;
  },
  daysRemainingInTrial: number | null
): string {
  switch (billing.status) {
    case BillingStatus.TRIAL_PENDING:
      return "Complete onboarding to start trial";

    case BillingStatus.TRIAL_ACTIVE:
      if (daysRemainingInTrial !== null) {
        if (daysRemainingInTrial <= 1) {
          return `Trial expires in ${daysRemainingInTrial} day - add payment immediately`;
        } else if (daysRemainingInTrial <= 3) {
          return `Trial expires in ${daysRemainingInTrial} days - add payment soon`;
        } else {
          return `Trial active (${daysRemainingInTrial} days remaining)`;
        }
      }
      return "Trial active";

    case BillingStatus.TRIAL_EXPIRED:
      return "Trial expired - add payment to reactivate";

    case BillingStatus.ACTIVE:
      return "Active subscription - no action needed";

    case BillingStatus.DELINQUENT:
      return "Payment failed - update payment method to avoid cancellation";

    case BillingStatus.CANCELED:
      if (billing.subscriptionEndsAt) {
        const daysAgo = Math.floor(
          (new Date().getTime() - billing.subscriptionEndsAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        return `Canceled ${daysAgo} days ago - contact support to reactivate`;
      }
      return "Canceled - contact support to reactivate";

    case BillingStatus.SUSPENDED:
      return "Account suspended - contact support";

    default:
      return "Unknown status - contact support";
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  BATCH QUERIES (FOR ADMIN DASHBOARD)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Get billing summaries for all clients (admin dashboard).
 *
 * Returns summaries sorted by most urgent first.
 *
 * @returns Array of billing summaries
 */
export async function getAllBillingSummaries(): Promise<BillingSummary[]> {
  const allBilling = await prisma.clientBilling.findMany({
    include: {
      client: {
        select: {
          id: true,
        },
      },
    },
  });

  const summaries = await Promise.all(
    allBilling.map((billing) => getBillingSummary(billing.clientId))
  );

  // Filter out nulls and sort by urgency
  const validSummaries = summaries.filter((s): s is BillingSummary => s !== null);

  return validSummaries.sort((a, b) => {
    // Sort by urgency:
    // 1. TRIAL_EXPIRED (most urgent)
    // 2. DELINQUENT
    // 3. TRIAL_ACTIVE with < 2 days remaining
    // 4. TRIAL_ACTIVE with 2-7 days remaining
    // 5. ACTIVE
    // 6. Everything else

    const urgencyOrder: Record<BillingStatus, number> = {
      [BillingStatus.TRIAL_EXPIRED]: 1,
      [BillingStatus.DELINQUENT]: 2,
      [BillingStatus.TRIAL_ACTIVE]: 3, // Will be refined by days remaining
      [BillingStatus.TRIAL_PENDING]: 5,
      [BillingStatus.ACTIVE]: 6,
      [BillingStatus.CANCELED]: 7,
      [BillingStatus.SUSPENDED]: 8,
    };

    let aUrgency = urgencyOrder[a.status];
    let bUrgency = urgencyOrder[b.status];

    // Refine TRIAL_ACTIVE urgency based on days remaining
    if (a.status === BillingStatus.TRIAL_ACTIVE && a.daysRemainingInTrial !== null) {
      if (a.daysRemainingInTrial <= 1) {
        aUrgency = 1.5; // Very urgent
      } else if (a.daysRemainingInTrial <= 3) {
        aUrgency = 2.5; // Moderately urgent
      }
    }

    if (b.status === BillingStatus.TRIAL_ACTIVE && b.daysRemainingInTrial !== null) {
      if (b.daysRemainingInTrial <= 1) {
        bUrgency = 1.5;
      } else if (b.daysRemainingInTrial <= 3) {
        bUrgency = 2.5;
      }
    }

    return aUrgency - bUrgency;
  });
}

/**
 * Get count of clients by billing status.
 *
 * Useful for dashboard metrics.
 *
 * @returns Object with status counts
 */
export async function getBillingStatusCounts(): Promise<Record<BillingStatus, number>> {
  const counts = await prisma.clientBilling.groupBy({
    by: ["status"],
    _count: true,
  });

  const result: Record<BillingStatus, number> = {
    [BillingStatus.TRIAL_PENDING]: 0,
    [BillingStatus.TRIAL_ACTIVE]: 0,
    [BillingStatus.TRIAL_EXPIRED]: 0,
    [BillingStatus.ACTIVE]: 0,
    [BillingStatus.DELINQUENT]: 0,
    [BillingStatus.CANCELED]: 0,
    [BillingStatus.SUSPENDED]: 0,
  };

  for (const count of counts) {
    result[count.status] = count._count;
  }

  return result;
}
