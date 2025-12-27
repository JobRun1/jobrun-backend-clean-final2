/**
 * TIER 2: KILL SWITCHES (UPDATED)
 *
 * Circuit breaker service for emergency automation control.
 * Provides client-level kill switches that can be toggled instantly to:
 * - Stop runaway automation
 * - Pause billing disputes
 * - Debug AI issues
 * - Handle OpenAI outages
 *
 * DESIGN PRINCIPLES:
 * - Checks happen EARLY in request flow
 * - System still logs and processes, but does NOT send or execute
 * - Kill switches are fail-safe: they STOP actions, not START them
 * - All activations are logged for audit trail
 *
 * TIER 2 UPDATE:
 * - Now uses ClientControls model (canonical source)
 * - Removed `as any` casts
 * - Requires controls relation to be loaded
 */

import { Client, ClientSettings, ClientControls } from '@prisma/client';

/**
 * Type for Client with controls relation
 */
export type ClientWithControls = Client & {
  controls?: ClientControls | null;
};

/**
 * Result of kill switch check.
 */
export interface KillSwitchCheckResult {
  allowed: boolean;
  reason?: string;
  switchName?: string;
}

/**
 * KILL SWITCH 1: Outbound Pause
 *
 * Stops ALL outbound SMS to customers.
 * System still processes, logs, and runs AI, but does NOT send TwiML response.
 *
 * USE CASES:
 * - Runaway automation sending spam
 * - Billing dispute (client requests pause)
 * - Emergency stop during debugging
 *
 * @param client - Client record with controls relation
 * @returns Check result with allowed flag
 */
export function checkOutboundAllowed(client: ClientWithControls): KillSwitchCheckResult {
  if (client.controls?.outboundPaused) {
    console.warn(`[KillSwitch] OUTBOUND_PAUSED for client ${client.id}`);
    console.warn(`  Reason: ${client.controls.outboundPausedReason || 'No reason provided'}`);
    console.warn(`  Paused at: ${client.controls.outboundPausedAt}`);
    return {
      allowed: false,
      reason: client.controls.outboundPausedReason || 'Outbound SMS paused for this client',
      switchName: 'outboundPaused',
    };
  }

  return { allowed: true };
}

/**
 * KILL SWITCH 2: AI Disabled
 *
 * Forces deterministic fallback, bypasses OpenAI entirely.
 * System falls back to keyword-based classification + static templates.
 *
 * USE CASES:
 * - OpenAI downtime (fail-safe mode)
 * - Cost control (prevent expensive LLM calls)
 * - Debugging AI classification issues
 *
 * @param client - Client record with controls relation
 * @returns Check result with allowed flag
 */
export function checkAiAllowed(client: ClientWithControls): KillSwitchCheckResult {
  if (client.controls?.aiDisabled) {
    console.warn(`[KillSwitch] AI_DISABLED for client ${client.id} - using deterministic fallback`);
    console.warn(`  Reason: ${client.controls.aiDisabledReason || 'No reason provided'}`);
    console.warn(`  Disabled at: ${client.controls.aiDisabledAt}`);
    return {
      allowed: false,
      reason: client.controls.aiDisabledReason || 'AI disabled, using deterministic fallback',
      switchName: 'aiDisabled',
    };
  }

  return { allowed: true };
}

/**
 * KILL SWITCH 3: Notifications Paused
 *
 * Stops ALL business owner notifications (SMS, email, etc.)
 * System still processes customer messages and sends replies.
 *
 * USE CASES:
 * - Client on vacation
 * - Testing mode (don't spam owner)
 * - Owner requests temporary silence
 *
 * NOTE: This field is in ClientSettings, not Client.
 *
 * @param clientSettings - ClientSettings record with notificationsPaused field
 * @returns Check result with allowed flag
 */
export function checkNotificationsAllowed(clientSettings: ClientSettings | null): KillSwitchCheckResult {
  if (clientSettings?.notificationsPaused) {
    console.warn(`[KillSwitch] NOTIFICATIONS_PAUSED for client ${clientSettings.clientId}`);
    return {
      allowed: false,
      reason: 'Notifications paused for this client',
      switchName: 'notificationsPaused',
    };
  }

  return { allowed: true };
}

/**
 * Logs kill switch activation for audit trail.
 * Called when a kill switch blocks an action.
 *
 * @param clientId - Client ID
 * @param switchName - Name of activated switch
 * @param blockedAction - What action was blocked (e.g., "outbound_sms", "ai_pipeline", "notification")
 */
export function logKillSwitchActivation(
  clientId: string,
  switchName: string,
  blockedAction: string
): void {
  console.log(`[KillSwitch] ACTIVATION LOG:`, {
    clientId,
    switchName,
    blockedAction,
    timestamp: new Date().toISOString(),
  });

  // TODO: In production, persist to database for compliance/audit
  // await prisma.killSwitchLog.create({
  //   data: { clientId, switchName, blockedAction, activatedAt: new Date() }
  // });
}

/**
 * Generates safe fallback message when outbound is paused.
 * Returns empty string to signal "no response" to Twilio.
 */
export function getOutboundPausedMessage(): string {
  // Return empty - Twilio will not send any SMS if TwiML has no <Message>
  return '';
}
