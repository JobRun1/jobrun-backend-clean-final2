/**
 * PHASE 5: ADMIN ACTIONS SERVICE
 *
 * Manual resolution capabilities for operators.
 *
 * CRITICAL SAFETY CONSTRAINTS:
 * - All billing transitions use transitionBillingState()
 * - Manual payment uses PaymentSource.MANUAL (not STRIPE)
 * - Destructive actions require confirmBusinessName check
 * - All actions logged to AdminAction audit trail
 * - No backdoor mutations allowed
 *
 * DESTRUCTIVE ACTIONS (require business name confirmation):
 * - pauseOutbound
 * - confirmPaymentManual
 * - muteAlerts
 * - completeOnboardingManual
 */

import { prisma } from '../db';
import { PaymentSource, OnboardingStateEnum } from '@prisma/client';
import {
  activateSubscription,
  BillingTransitionResult,
} from '../utils/billingTransitions';

/**
 * Audit log helper for all admin actions.
 *
 * @param adminId - User ID of admin performing action
 * @param clientId - Affected client (null for global actions)
 * @param action - Action type (e.g., 'confirm_payment_manual')
 * @param reason - Operator-provided justification
 * @param metadata - Additional context
 */
async function logAdminAction(
  adminId: string,
  clientId: string | null,
  action: string,
  reason: string | null,
  metadata?: Record<string, any>
): Promise<void> {
  await prisma.adminAction.create({
    data: {
      adminId,
      clientId,
      action,
      reason,
      metadata: metadata || {},
    },
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`[ADMIN_ACTION] ${action}`);
  console.log(`[ADMIN_ACTION] Admin: ${adminId}`);
  console.log(`[ADMIN_ACTION] Client: ${clientId || 'GLOBAL'}`);
  console.log(`[ADMIN_ACTION] Reason: ${reason || 'None provided'}`);
  if (metadata) {
    console.log(`[ADMIN_ACTION] Metadata:`, metadata);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Verify business name matches for destructive actions.
 *
 * Prevents accidental operations on wrong client.
 *
 * @param clientId - Client ID
 * @param confirmBusinessName - Business name provided by operator
 * @throws Error if business name doesn't match
 */
async function verifyBusinessName(
  clientId: string,
  confirmBusinessName: string
): Promise<void> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { businessName: true },
  });

  if (!client) {
    throw new Error(`Client ${clientId} not found`);
  }

  if (client.businessName !== confirmBusinessName) {
    throw new Error(
      `Business name mismatch. Expected "${client.businessName}", got "${confirmBusinessName}"`
    );
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ACTION 1: CONFIRM PAYMENT (MANUAL)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Manually confirm payment for a client.
 *
 * USE CASE: Client completes onboarding but Stripe checkout fails/abandoned.
 * Operator confirms payment via wire transfer, check, or other manual method.
 *
 * SAFETY:
 * - Requires business name confirmation
 * - Sets paymentSource = MANUAL (not STRIPE)
 * - Transitions via activateSubscription() (respects billing law)
 * - Requires admin reason for audit trail
 *
 * @param clientId - Client to activate
 * @param adminId - Admin performing action
 * @param reason - Justification for manual payment
 * @param confirmBusinessName - Business name confirmation (safety check)
 * @returns Billing transition result
 */
export async function confirmPaymentManual(
  clientId: string,
  adminId: string,
  reason: string,
  confirmBusinessName: string
): Promise<BillingTransitionResult> {
  // SAFETY: Verify business name
  await verifyBusinessName(clientId, confirmBusinessName);

  console.log(`[ADMIN] Confirming manual payment for client ${clientId}`);

  // Step 1: Ensure ClientBilling and ClientControls exist
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { billing: true, controls: true },
  });

  if (!client) {
    throw new Error(`Client ${clientId} not found`);
  }

  // Ensure billing record exists
  if (!client.billing) {
    await prisma.clientBilling.create({
      data: {
        clientId,
        status: 'TRIAL_PENDING',
        paymentSource: 'NONE',
      },
    });
  }

  // Ensure controls record exists
  if (!client.controls) {
    await prisma.clientControls.create({
      data: { clientId },
    });
  }

  // Step 2: Set payment source to MANUAL
  await prisma.clientBilling.update({
    where: { clientId },
    data: {
      paymentSource: PaymentSource.MANUAL,
    },
  });

  console.log(`[ADMIN] Set paymentSource=MANUAL for client ${clientId}`);

  // Step 3: Activate subscription via canonical transition
  const result = await activateSubscription(
    clientId,
    `Admin: Manual payment confirmation by ${adminId} - ${reason}`
  );

  // Step 4: Audit log
  await logAdminAction(adminId, clientId, 'confirm_payment_manual', reason, {
    fromStatus: result.success ? result.fromStatus : 'UNKNOWN',
    toStatus: result.success ? result.toStatus : 'UNKNOWN',
    success: result.success,
  });

  return result;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ACTION 2: COMPLETE ONBOARDING (MANUAL)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Manually complete onboarding for stuck client.
 *
 * USE CASE: Onboarding stuck due to Twilio issues, SMS delivery failures,
 * or infinite loop. Operator verifies client setup and forces completion.
 *
 * SAFETY:
 * - Requires business name confirmation
 * - Only transitions onboarding state (not billing)
 * - Records manual completion timestamp
 * - Requires admin reason
 *
 * @param clientId - Client to complete onboarding for
 * @param adminId - Admin performing action
 * @param reason - Justification for manual completion
 * @param confirmBusinessName - Business name confirmation (safety check)
 */
export async function completeOnboardingManual(
  clientId: string,
  adminId: string,
  reason: string,
  confirmBusinessName: string
): Promise<void> {
  // SAFETY: Verify business name
  await verifyBusinessName(clientId, confirmBusinessName);

  console.log(`[ADMIN] Manually completing onboarding for client ${clientId}`);

  // Ensure onboarding state exists
  const onboarding = await prisma.onboardingState.findUnique({
    where: { clientId },
  });

  if (!onboarding) {
    throw new Error(`No onboarding state found for client ${clientId}`);
  }

  if (onboarding.currentState === OnboardingStateEnum.COMPLETE) {
    throw new Error(`Client ${clientId} onboarding already complete`);
  }

  // Transition to COMPLETE
  await prisma.onboardingState.update({
    where: { clientId },
    data: {
      currentState: OnboardingStateEnum.COMPLETE,
      completedAt: new Date(),
    },
  });

  console.log(`[ADMIN] Onboarding completed for client ${clientId}`);

  // Audit log
  await logAdminAction(adminId, clientId, 'complete_onboarding_manual', reason, {
    previousState: onboarding.currentState,
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ACTION 3: PAUSE/RESUME OUTBOUND
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Pause outbound messaging for a client.
 *
 * USE CASE: Client reports SMS spam, regulatory issue, or system misbehavior.
 *
 * SAFETY:
 * - Requires business name confirmation
 * - Sets kill switch in ClientControls
 * - Does NOT affect billing state
 * - Requires reason for pause
 *
 * @param clientId - Client to pause
 * @param adminId - Admin performing action
 * @param reason - Justification for pause
 * @param confirmBusinessName - Business name confirmation (safety check)
 */
export async function pauseOutbound(
  clientId: string,
  adminId: string,
  reason: string,
  confirmBusinessName: string
): Promise<void> {
  // SAFETY: Verify business name
  await verifyBusinessName(clientId, confirmBusinessName);

  console.log(`[ADMIN] Pausing outbound for client ${clientId}`);

  // Ensure controls record exists
  const controls = await prisma.clientControls.findUnique({
    where: { clientId },
  });

  if (!controls) {
    await prisma.clientControls.create({
      data: { clientId },
    });
  }

  await prisma.clientControls.update({
    where: { clientId },
    data: {
      outboundPaused: true,
      outboundPausedAt: new Date(),
      outboundPausedReason: reason,
    },
  });

  console.log(`[ADMIN] Outbound paused for client ${clientId}: ${reason}`);

  // Audit log
  await logAdminAction(adminId, clientId, 'pause_outbound', reason);
}

/**
 * Resume outbound messaging for a client.
 *
 * @param clientId - Client to resume
 * @param adminId - Admin performing action
 */
export async function resumeOutbound(
  clientId: string,
  adminId: string
): Promise<void> {
  console.log(`[ADMIN] Resuming outbound for client ${clientId}`);

  await prisma.clientControls.update({
    where: { clientId },
    data: {
      outboundPaused: false,
      outboundPausedAt: null,
      outboundPausedReason: null,
    },
  });

  console.log(`[ADMIN] Outbound resumed for client ${clientId}`);

  // Audit log
  await logAdminAction(adminId, clientId, 'resume_outbound', null);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ACTION 4: MUTE/UNMUTE ALERTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Mute ops alerts for a client.
 *
 * USE CASE: Operator investigating issue, doesn't want alert spam during
 * debug session.
 *
 * SAFETY:
 * - Requires business name confirmation
 * - Temporary suppression (operator must remember to unmute)
 * - Does NOT delete alerts
 * - Visible in operational state
 *
 * @param clientId - Client to mute
 * @param adminId - Admin performing action
 * @param reason - Justification for mute
 * @param confirmBusinessName - Business name confirmation (safety check)
 */
export async function muteAlerts(
  clientId: string,
  adminId: string,
  reason: string,
  confirmBusinessName: string
): Promise<void> {
  // SAFETY: Verify business name
  await verifyBusinessName(clientId, confirmBusinessName);

  console.log(`[ADMIN] Muting alerts for client ${clientId}`);

  // Ensure controls record exists
  const controls = await prisma.clientControls.findUnique({
    where: { clientId },
  });

  if (!controls) {
    await prisma.clientControls.create({
      data: { clientId },
    });
  }

  await prisma.clientControls.update({
    where: { clientId },
    data: {
      opsAlertsMuted: true,
    },
  });

  console.log(`[ADMIN] Alerts muted for client ${clientId}: ${reason}`);

  // Audit log
  await logAdminAction(adminId, clientId, 'mute_alerts', reason);
}

/**
 * Unmute ops alerts for a client.
 *
 * @param clientId - Client to unmute
 * @param adminId - Admin performing action
 */
export async function unmuteAlerts(
  clientId: string,
  adminId: string
): Promise<void> {
  console.log(`[ADMIN] Unmuting alerts for client ${clientId}`);

  await prisma.clientControls.update({
    where: { clientId },
    data: {
      opsAlertsMuted: false,
    },
  });

  console.log(`[ADMIN] Alerts unmuted for client ${clientId}`);

  // Audit log
  await logAdminAction(adminId, clientId, 'unmute_alerts', null);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ACTION 5: ACKNOWLEDGE ALERT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Acknowledge an alert to prevent re-firing.
 *
 * USE CASE: Operator sees alert, investigates issue, acknowledges to prevent
 * spam while working on root cause.
 *
 * BEHAVIOR:
 * - Alert won't re-fire for same condition within 24h cooldown
 * - After 24h, if condition persists, alert can fire again
 * - Acknowledgment visible in alert history
 *
 * @param alertId - Alert ID to acknowledge
 * @param adminId - Admin performing action
 * @param resolution - How the alert was resolved/addressed
 */
export async function acknowledgeAlert(
  alertId: string,
  adminId: string,
  resolution: string
): Promise<void> {
  console.log(`[ADMIN] Acknowledging alert ${alertId}`);

  const alert = await prisma.alertLog.findUnique({
    where: { id: alertId },
  });

  if (!alert) {
    throw new Error(`Alert ${alertId} not found`);
  }

  if (alert.acknowledgedAt) {
    throw new Error(
      `Alert ${alertId} already acknowledged at ${alert.acknowledgedAt.toISOString()}`
    );
  }

  await prisma.alertLog.update({
    where: { id: alertId },
    data: {
      acknowledgedAt: new Date(),
      acknowledgedBy: adminId,
      resolution,
    },
  });

  console.log(`[ADMIN] Alert ${alertId} acknowledged by ${adminId}: ${resolution}`);

  // Audit log
  await logAdminAction(adminId, alert.resourceId, 'acknowledge_alert', resolution, {
    alertId: alert.id,
    alertType: alert.alertType,
    alertKey: alert.alertKey,
  });
}
