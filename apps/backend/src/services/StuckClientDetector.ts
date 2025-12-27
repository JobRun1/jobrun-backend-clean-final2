/**
 * STUCK CLIENT DETECTOR
 *
 * Production-hardening subsystem for detecting clients blocked in onboarding.
 *
 * PURPOSE:
 * - Allows operator to answer: "Which clients need my attention right now?"
 * - Provides time-based detection without relying on logs alone
 * - Prevents silent failures by surfacing actionable stuck states
 *
 * DESIGN PRINCIPLES:
 * - Additive only (no business logic changes)
 * - Deterministic (same input = same output)
 * - Idempotent (won't repeatedly alert for same condition)
 * - Conservative thresholds (avoids false positives)
 */

import { prisma } from "../db";
import { OnboardingState as PrismaOnboardingStateEnum } from "@prisma/client";
import { AlertService, AlertTemplates } from "./AlertService";
import { isPaymentValid } from "../utils/billingUtils";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  STUCK THRESHOLD DEFINITIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type StuckSeverity = "LOW" | "MEDIUM" | "HIGH";

interface StateThreshold {
  state: string;
  thresholdMinutes: number;
  severity: StuckSeverity;
  reason: string;
  isTerminal: boolean; // If true, client will never progress without intervention
}

/**
 * TIME-BASED THRESHOLDS FOR STUCK DETECTION
 *
 * Philosophy:
 * - Early states (S1-S4): 30 min (simple questions, should be quick)
 * - Payment gate (S5): 2 hours (might need to think about commitment)
 * - Setup states (S6-S8): 1-2 hours (requires action but not urgent)
 * - Test call (S9): 24 hours (CRITICAL - might never complete)
 *
 * TERMINAL STATES:
 * - S9_TEST_CALL: Client might never make test call (no retry mechanism)
 * - Payment-blocked at S5: Client might never pay (requires manual follow-up)
 */
const STUCK_THRESHOLDS: StateThreshold[] = [
  {
    state: "S1_BUSINESS_TYPE_LOCATION",
    thresholdMinutes: 30,
    severity: "LOW",
    reason: "Hasn't provided business type and location",
    isTerminal: false,
  },
  {
    state: "S2_BUSINESS_NAME",
    thresholdMinutes: 30,
    severity: "LOW",
    reason: "Hasn't provided business name",
    isTerminal: false,
  },
  {
    state: "S3_OWNER_NAME",
    thresholdMinutes: 30,
    severity: "LOW",
    reason: "Hasn't provided owner name",
    isTerminal: false,
  },
  {
    state: "S4_NOTIFICATION_PREF",
    thresholdMinutes: 30,
    severity: "LOW",
    reason: "Hasn't confirmed SMS notification preference",
    isTerminal: false,
  },
  {
    state: "S5_CONFIRM_LIVE",
    thresholdMinutes: 120, // 2 hours
    severity: "MEDIUM",
    reason: "Hasn't confirmed activation (may be blocked by payment gate)",
    isTerminal: false, // Can progress if they pay
  },
  {
    state: "S6_PHONE_TYPE",
    thresholdMinutes: 60, // 1 hour
    severity: "MEDIUM",
    reason: "Hasn't selected phone type for forwarding setup",
    isTerminal: false,
  },
  {
    state: "S7_FWD_SENT",
    thresholdMinutes: 120, // 2 hours
    severity: "MEDIUM",
    reason: "Hasn't confirmed call forwarding setup completion",
    isTerminal: false,
  },
  {
    state: "S8_FWD_CONFIRM",
    thresholdMinutes: 120, // 2 hours
    severity: "MEDIUM",
    reason: "Hasn't confirmed readiness for test call",
    isTerminal: false,
  },
  {
    state: "S9_TEST_CALL",
    thresholdMinutes: 1440, // 24 hours
    severity: "HIGH",
    reason: "Hasn't completed test call (CRITICAL - no retry mechanism)",
    isTerminal: true, // Will never auto-advance
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  STUCK CLIENT DATA TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface StuckClient {
  clientId: string;
  phoneNumber: string | null;
  businessName: string;
  currentState: string;
  timeInStateMinutes: number;
  timeInStateHuman: string;
  reason: string;
  severity: StuckSeverity;
  isTerminal: boolean;
  hasValidPayment: boolean;
  twilioNumberAssigned: boolean;
  lastUpdated: Date;
  stuckDetectedAt: Date | null;
  paymentGateAlertedAt: Date | null;
  opsAlertsMuted: boolean;
}

export interface StuckClientSummary {
  total: number;
  byState: Record<string, number>;
  bySeverity: Record<StuckSeverity, number>;
  clients: StuckClient[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DETECTION LOGIC
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class StuckClientDetector {
  /**
   * Detect all currently stuck clients
   *
   * This is the PRIMARY interface for operators.
   */
  static async detectStuckClients(): Promise<StuckClientSummary> {
    const now = new Date();

    // Fetch all incomplete onboarding states with client data
    const incompleteStates = await prisma.onboardingState.findMany({
      where: {
        currentState: {
          not: "COMPLETE",
        },
      },
      select: {
        id: true,
        clientId: true,
        currentState: true,
        updatedAt: true,
        stuckDetectedAt: true,
        client: {
          select: {
            id: true,
            phoneNumber: true,
            businessName: true,
            twilioNumber: true,
            billing: {
              select: {
                status: true,
              },
            },
            controls: {
              select: {
                paymentGateAlertedAt: true,
                opsAlertsMuted: true,
              },
            },
          },
        },
      },
    });

    const stuckClients: StuckClient[] = [];

    for (const state of incompleteStates) {
      const threshold = this.getThresholdForState(state.currentState);

      if (!threshold) {
        // State not in threshold map (shouldn't happen, but defensive)
        continue;
      }

      const minutesInState = this.calculateMinutesInState(state.updatedAt, now);

      // Check if client exceeds threshold for current state
      if (minutesInState >= threshold.thresholdMinutes) {
        stuckClients.push({
          clientId: state.client.id,
          phoneNumber: state.client.phoneNumber,
          businessName: state.client.businessName,
          currentState: state.currentState,
          timeInStateMinutes: minutesInState,
          timeInStateHuman: this.formatDuration(minutesInState),
          reason: threshold.reason,
          severity: threshold.severity,
          isTerminal: threshold.isTerminal,
          hasValidPayment: state.client.billing ? isPaymentValid(state.client.billing.status) : false,
          twilioNumberAssigned: !!state.client.twilioNumber,
          lastUpdated: state.updatedAt,
          stuckDetectedAt: state.stuckDetectedAt,
          paymentGateAlertedAt: state.client.controls?.paymentGateAlertedAt || null,
          opsAlertsMuted: state.client.controls?.opsAlertsMuted || false,
        });
      }
    }

    // Aggregate statistics
    const byState: Record<string, number> = {};
    const bySeverity: Record<StuckSeverity, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
    };

    for (const client of stuckClients) {
      byState[client.currentState] = (byState[client.currentState] || 0) + 1;
      bySeverity[client.severity]++;
    }

    return {
      total: stuckClients.length,
      byState,
      bySeverity,
      clients: stuckClients.sort((a, b) => {
        // Sort by severity (HIGH first), then by time in state (longest first)
        if (a.severity !== b.severity) {
          const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return b.timeInStateMinutes - a.timeInStateMinutes;
      }),
    };
  }

  /**
   * Detect and log stuck clients (for automated monitoring)
   *
   * This method:
   * 1. Detects stuck clients
   * 2. Emits structured log events for NEW stuck conditions
   * 3. Updates stuckDetectedAt to prevent repeated alerts
   */
  static async detectAndLog(): Promise<void> {
    const summary = await this.detectStuckClients();

    if (summary.total === 0) {
      console.log("✅ [STUCK_DETECTOR] No stuck clients detected");
      return;
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`⚠️  [STUCK_DETECTOR] STUCK CLIENTS DETECTED: ${summary.total}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   HIGH: ${summary.bySeverity.HIGH}`);
    console.log(`   MEDIUM: ${summary.bySeverity.MEDIUM}`);
    console.log(`   LOW: ${summary.bySeverity.LOW}`);
    console.log("");

    const now = new Date();

    for (const client of summary.clients) {
      // Check if this is a NEW stuck condition (not already alerted)
      const isNewStuckCondition = !client.stuckDetectedAt ||
        this.calculateMinutesInState(client.stuckDetectedAt, now) > 360; // Re-alert after 6 hours

      if (isNewStuckCondition) {
        // Emit structured log event
        console.log("STUCK_CLIENT_DETECTED", {
          clientId: client.clientId,
          phoneNumber: client.phoneNumber,
          businessName: client.businessName,
          currentState: client.currentState,
          timeInState: client.timeInStateHuman,
          severity: client.severity,
          reason: client.reason,
          isTerminal: client.isTerminal,
          hasValidPayment: client.hasValidPayment,
          twilioNumberAssigned: client.twilioNumberAssigned,
          timestamp: now.toISOString(),
        });

        // CRITICAL ALERTING: Send alert for HIGH severity + terminal states
        if (client.severity === "HIGH" && client.isTerminal) {
          await AlertService.sendCriticalAlert(
            AlertTemplates.stuckClient({
              clientId: client.clientId,
              businessName: client.businessName,
              phoneNumber: client.phoneNumber,
              currentState: client.currentState,
              timeInState: client.timeInStateHuman,
            })
          );
        }

        // PAYMENT BLOCK ALERTING: State-based (send once, no repeats)
        // Only alert if:
        // - Client is at S5_CONFIRM_LIVE (payment gate)
        // - hasValidPayment = false (blocked by payment)
        // - Stuck for >2 hours
        // - NOT muted (opsAlertsMuted = false)
        // - NOT already alerted (paymentGateAlertedAt IS NULL)
        if (
          client.currentState === "S5_CONFIRM_LIVE" &&
          !client.hasValidPayment &&
          client.timeInStateMinutes > 120 &&
          !client.opsAlertsMuted &&
          client.paymentGateAlertedAt === null
        ) {
          await AlertService.sendCriticalAlert(
            AlertTemplates.paymentBlock({
              clientId: client.clientId,
              businessName: client.businessName,
              phoneNumber: client.phoneNumber,
              timeInState: client.timeInStateHuman,
            })
          );

          // Mark alert as sent (prevents repeat alerts until payment resolves)
          // Update ClientControls (Phase 5: Moved from Client)
          await prisma.clientControls.upsert({
            where: { clientId: client.clientId },
            create: {
              clientId: client.clientId,
              paymentGateAlertedAt: now,
              paymentGateAlertCount: 1,
            },
            update: {
              paymentGateAlertedAt: now,
              paymentGateAlertCount: { increment: 1 },
            },
          });
        }

        // Update stuckDetectedAt to prevent repeated alerts
        await prisma.onboardingState.update({
          where: { clientId: client.clientId },
          data: { stuckDetectedAt: now },
        });
      }
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }

  /**
   * Get threshold configuration for a specific state
   */
  private static getThresholdForState(state: string): StateThreshold | null {
    return STUCK_THRESHOLDS.find((t) => t.state === state) || null;
  }

  /**
   * Calculate minutes elapsed between two timestamps
   */
  private static calculateMinutesInState(lastUpdate: Date, now: Date): number {
    const diffMs = now.getTime() - lastUpdate.getTime();
    return Math.floor(diffMs / 1000 / 60);
  }

  /**
   * Format duration in human-readable format
   */
  private static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours < 24) {
      return remainingMinutes > 0
        ? `${hours}h ${remainingMinutes}min`
        : `${hours}h`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    return remainingHours > 0
      ? `${days}d ${remainingHours}h`
      : `${days}d`;
  }

  /**
   * Get all terminal stuck clients (require manual intervention)
   */
  static async getTerminalStuckClients(): Promise<StuckClient[]> {
    const summary = await this.detectStuckClients();
    return summary.clients.filter((c) => c.isTerminal);
  }

  /**
   * Get stuck clients by severity
   */
  static async getStuckClientsBySeverity(severity: StuckSeverity): Promise<StuckClient[]> {
    const summary = await this.detectStuckClients();
    return summary.clients.filter((c) => c.severity === severity);
  }

  /**
   * Reset payment gate alert when payment resolves
   *
   * Call this when:
   * - billing.status transitions to TRIAL_ACTIVE or ACTIVE
   *
   * This clears paymentGateAlertedAt to allow new alerts if payment fails again.
   * paymentGateAlertCount is NOT reset (preserves historical count).
   */
  static async resetPaymentGateAlert(clientId: string): Promise<void> {
    // Phase 5: Updated to use ClientControls instead of Client
    const controls = await prisma.clientControls.findUnique({
      where: { clientId },
    });

    if (!controls) {
      console.log(`[STUCK_DETECTOR] No controls record for client ${clientId}, skipping reset`);
      return;
    }

    await prisma.clientControls.update({
      where: { clientId },
      data: {
        paymentGateAlertedAt: null,
        // paymentGateAlertCount is NOT reset (historical record)
      },
    });

    console.log(`✅ [STUCK_DETECTOR] Payment gate alert reset for client ${clientId}`);
  }
}
