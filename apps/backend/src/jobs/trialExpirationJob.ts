/**
 * TIER 3 PHASE 3: TRIAL EXPIRATION JOB (TIME AUTHORITY)
 *
 * System-driven job that expires trials automatically based on time.
 *
 * ⚠️ NO DIRECT billing.status MUTATIONS ALLOWED
 * ⚠️ ALL transitions MUST use transitionBillingState()
 *
 * DESIGN PRINCIPLES:
 * - Time drives state, not requests
 * - Idempotent (safe to run twice)
 * - Safe if cron fails for 24h (will catch up on next run)
 * - Explicit logging for audit trail
 * - No assumptions about current state
 */

import { prisma } from "../db";
import { BillingStatus } from "@prisma/client";
import { expireTrial } from "../utils/billingTransitions";
import { TRIAL_EXPIRATION_BEHAVIOR } from "../config/billingConfig";
import { AlertService, AlertTemplates } from "../services/AlertService";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TRIAL EXPIRATION SWEEP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface TrialExpirationSummary {
  totalChecked: number;
  expired: number;
  alreadyExpired: number;
  errors: number;
  clientsExpired: string[];
}

/**
 * Run trial expiration sweep.
 *
 * ALGORITHM:
 * 1. Query for all clients with status = TRIAL_ACTIVE
 * 2. Filter where trialEndsAt < NOW
 * 3. Transition each to TRIAL_EXPIRED using canonical helper
 * 4. Alert ops for each expiration (once per client)
 * 5. Log summary
 *
 * IDEMPOTENCY:
 * - Safe to run multiple times (transition function is idempotent)
 * - Won't re-alert if already expired (checks previous alerts)
 * - No side effects if no trials need expiring
 *
 * SAFETY:
 * - No direct status mutations
 * - Validates before transitioning
 * - Logs all attempts (success + failure)
 * - Continues on error (doesn't stop sweep if one client fails)
 *
 * @returns Summary of sweep results
 */
export async function runTrialExpirationSweep(): Promise<TrialExpirationSummary> {
  const now = new Date();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🕐 [TRIAL_EXPIRATION_SWEEP] Starting sweep");
  console.log(`   Timestamp: ${now.toISOString()}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const summary: TrialExpirationSummary = {
    totalChecked: 0,
    expired: 0,
    alreadyExpired: 0,
    errors: 0,
    clientsExpired: [],
  };

  try {
    // QUERY: Find all active trials
    const activeTrials = await prisma.clientBilling.findMany({
      where: {
        status: BillingStatus.TRIAL_ACTIVE,
      },
      include: {
        client: {
          select: {
            id: true,
            businessName: true,
            phoneNumber: true,
          },
        },
      },
    });

    summary.totalChecked = activeTrials.length;

    console.log(`📋 [TRIAL_EXPIRATION_SWEEP] Found ${activeTrials.length} active trials`);

    if (activeTrials.length === 0) {
      console.log("✅ [TRIAL_EXPIRATION_SWEEP] No active trials to check");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      return summary;
    }

    // FILTER: Check each trial for expiration
    for (const billing of activeTrials) {
      const clientId = billing.clientId;
      const trialEndsAt = billing.trialEndsAt;

      if (!trialEndsAt) {
        console.warn(`⚠️ [TRIAL_EXPIRATION_SWEEP] Client ${clientId} has TRIAL_ACTIVE but no trialEndsAt - skipping`);
        continue;
      }

      // CHECK: Has trial expired?
      if (trialEndsAt > now) {
        const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`⏳ [TRIAL_EXPIRATION_SWEEP] Client ${clientId} trial expires in ${daysRemaining} days - skipping`);
        continue;
      }

      // EXPIRED: Transition to TRIAL_EXPIRED
      const daysOverdue = Math.floor((now.getTime() - trialEndsAt.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`⏰ [TRIAL_EXPIRATION_SWEEP] Client ${clientId} trial expired ${daysOverdue} days ago - expiring now`);

      try {
        // TRANSITION: Use canonical helper (validates + audits)
        const result = await expireTrial(clientId);

        if (result.success) {
          if (result.fromStatus === result.toStatus) {
            // Idempotent: Already expired
            console.log(`✅ [TRIAL_EXPIRATION_SWEEP] Client ${clientId} already expired (idempotent)`);
            summary.alreadyExpired++;
          } else {
            // Success: Transitioned
            console.log(`✅ [TRIAL_EXPIRATION_SWEEP] Client ${clientId} expired successfully`);
            summary.expired++;
            summary.clientsExpired.push(clientId);

            // Emit structured log for monitoring
            console.log("TRIAL_EXPIRED", {
              clientId,
              businessName: billing.client.businessName,
              phoneNumber: billing.client.phoneNumber,
              trialEndsAt: trialEndsAt.toISOString(),
              daysOverdue,
              timestamp: now.toISOString(),
            });

            // ALERT OPS: Send critical alert (once per client)
            if (TRIAL_EXPIRATION_BEHAVIOR.alertOps && TRIAL_EXPIRATION_BEHAVIOR.alertOnce) {
              // Check if we've already alerted for this client's trial expiration
              // (We use the lastBillingEventType to track this)
              const recentEvents = await prisma.clientBilling.findUnique({
                where: { clientId },
                select: { lastBillingEventType: true },
              });

              const alreadyAlerted = recentEvents?.lastBillingEventType === "7-day trial expired, no payment";

              if (!alreadyAlerted) {
                await AlertService.sendCriticalAlert(
                  AlertTemplates.trialExpired({
                    clientId,
                    businessName: billing.client.businessName,
                    phoneNumber: billing.client.phoneNumber,
                    daysOverdue,
                  })
                );
                console.log(`🚨 [TRIAL_EXPIRATION_SWEEP] Alert sent for client ${clientId}`);
              } else {
                console.log(`⏭️ [TRIAL_EXPIRATION_SWEEP] Alert already sent for client ${clientId} - skipping`);
              }
            }
          }
        } else {
          // Transition failed (invalid state or database error)
          console.error(`❌ [TRIAL_EXPIRATION_SWEEP] Failed to expire client ${clientId}: ${result.error}`);
          summary.errors++;
        }
      } catch (error) {
        console.error(`❌ [TRIAL_EXPIRATION_SWEEP] Error expiring client ${clientId}:`, error);
        summary.errors++;
      }
    }

    // SUMMARY
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 [TRIAL_EXPIRATION_SWEEP] Sweep complete");
    console.log(`   Total checked: ${summary.totalChecked}`);
    console.log(`   Newly expired: ${summary.expired}`);
    console.log(`   Already expired: ${summary.alreadyExpired}`);
    console.log(`   Errors: ${summary.errors}`);
    if (summary.clientsExpired.length > 0) {
      console.log(`   Clients expired: ${summary.clientsExpired.join(", ")}`);
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return summary;
  } catch (error) {
    console.error("❌ [TRIAL_EXPIRATION_SWEEP] Sweep failed with critical error:", error);
    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DELINQUENCY SWEEP (STUB FOR PHASE 4)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Run delinquency sweep (ACTIVE → DELINQUENT → CANCELED).
 *
 * ⚠️ PHASE 4 ONLY — NOT IMPLEMENTED YET
 *
 * TODO PHASE 4:
 * 1. Query for DELINQUENT clients where grace period expired
 * 2. Transition to CANCELED using cancelSubscription()
 * 3. Alert ops for each cancellation
 * 4. Log summary
 *
 * GUARDRAILS:
 * - Must use transitionBillingState (NO direct mutations)
 * - Must check subscriptionEndsAt or grace period field
 * - Must be idempotent (safe to run twice)
 * - Must continue on error (don't stop sweep)
 *
 * @throws Error with message "PHASE 4 NOT IMPLEMENTED"
 */
export async function runDelinquencySweep(): Promise<void> {
  throw new Error(
    "PHASE 4 NOT IMPLEMENTED: Delinquency sweep requires Stripe webhook integration. " +
    "See DELINQUENCY_GRACE_PERIOD_DAYS in billingConfig.ts for configuration."
  );
}
