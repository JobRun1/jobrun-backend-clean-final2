/**
 * TIER 2: SYSTEMGATE - CENTRAL AUTHORIZATION LAYER (UPDATED)
 *
 * Single source of truth for ALL guard logic in the system.
 * Replaces inline checks scattered across twilio.ts, inboundSmsPipeline.ts, NotificationService.ts.
 *
 * DESIGN PRINCIPLES:
 * - Pure functions (no side effects)
 * - Explicit allow/deny + reason
 * - SOFT vs HARD block semantics
 * - Centralized logging
 * - Fail-safe defaults (block when uncertain)
 *
 * BLOCK TYPES:
 * - SOFT: Respond with polite fallback message (customer still gets a response)
 * - HARD: Return empty/suppress action entirely (no SMS sent, no notification sent)
 *
 * TIER 2 UPDATES:
 * - onboardingComplete DERIVED from OnboardingState.currentState
 * - outboundPaused / aiDisabled from ClientControls (canonical source)
 * - Removed all `as any` casts
 */

import { Client, ClientSettings, ClientControls } from '@prisma/client';
import { ClientWithOnboarding, isOnboardingComplete } from '../utils/onboardingUtils';

/**
 * Type for Client with all required relations for guards
 */
export type ClientWithGuardData = ClientWithOnboarding & {
  controls?: ClientControls | null;
};

/**
 * Result of a guard check.
 */
export interface GuardResult {
  allowed: boolean;
  reason?: string;
  blockType?: 'SOFT' | 'HARD';
  fallbackMessage?: string;
}

/**
 * GUARD 1: Can Respond to Customer
 *
 * Checks if the system is allowed to respond to customer messages AT ALL.
 * This is the FIRST gate - if this fails, NO automation runs.
 *
 * SOFT BLOCK: Onboarding incomplete (customer gets polite response, but NO automation)
 *
 * @param client - Client record with onboardingState relation
 * @returns GuardResult with allowed flag and fallback message if blocked
 */
export function canRespondToCustomer(client: ClientWithOnboarding): GuardResult {
  if (!isOnboardingComplete(client)) {
    const fallbackMessage = client.businessName
      ? `Thank you for reaching out to ${client.businessName}! We're currently setting up our automated system. A team member will contact you shortly.`
      : "Thank you for your message. Our system is currently being set up. We'll be in touch soon!";

    console.warn(`[SystemGate] SOFT BLOCK: canRespondToCustomer - client ${client.id} onboarding incomplete`);

    return {
      allowed: false,
      reason: 'Onboarding incomplete',
      blockType: 'SOFT',
      fallbackMessage,
    };
  }

  return { allowed: true };
}

/**
 * GUARD 2: Can Send SMS
 *
 * Checks if outbound SMS to customers is allowed.
 * Assumes onboarding is complete (checked by canRespondToCustomer first).
 *
 * HARD BLOCK: outboundPaused kill switch active (return empty TwiML)
 *
 * @param client - Client record with onboardingState and controls relations
 * @returns GuardResult with allowed flag
 */
export function canSendSMS(client: ClientWithGuardData): GuardResult {
  // First check: onboarding complete
  if (!isOnboardingComplete(client)) {
    console.warn(`[SystemGate] HARD BLOCK: canSendSMS - client ${client.id} onboarding incomplete`);
    return {
      allowed: false,
      reason: 'Onboarding incomplete - cannot send outbound SMS',
      blockType: 'HARD',
    };
  }

  // Second check: outbound not paused (kill switch)
  if (client.controls?.outboundPaused) {
    console.warn(`[SystemGate] HARD BLOCK: canSendSMS - client ${client.id} outbound paused`);
    console.warn(`  Reason: ${client.controls.outboundPausedReason || 'No reason provided'}`);
    return {
      allowed: false,
      reason: client.controls.outboundPausedReason || 'Outbound SMS paused (kill switch active)',
      blockType: 'HARD',
    };
  }

  return { allowed: true };
}

/**
 * GUARD 3: Can Send Booking Link
 *
 * Checks if system is allowed to send booking links to customers.
 * Requires BOTH onboarding complete AND valid booking URL configured.
 *
 * HARD BLOCK: Booking link sent without proper setup would create bad UX
 *
 * @param client - Client record with onboardingState relation
 * @param hasBookingUrl - Whether client has booking URL configured
 * @returns GuardResult with allowed flag
 */
export function canSendBookingLink(client: ClientWithOnboarding, hasBookingUrl: boolean): GuardResult {
  // First check: onboarding complete
  if (!isOnboardingComplete(client)) {
    console.warn(`[SystemGate] HARD BLOCK: canSendBookingLink - client ${client.id} onboarding incomplete`);
    return {
      allowed: false,
      reason: 'Onboarding incomplete - cannot send booking links',
      blockType: 'HARD',
    };
  }

  // Second check: booking URL configured
  if (!hasBookingUrl) {
    console.warn(`[SystemGate] HARD BLOCK: canSendBookingLink - client ${client.id} no booking URL`);
    return {
      allowed: false,
      reason: 'No booking URL configured',
      blockType: 'HARD',
    };
  }

  return { allowed: true };
}

/**
 * GUARD 4: Can Send Notification
 *
 * Checks if system is allowed to send business owner notifications (SMS, email, etc.)
 * Requires BOTH onboarding complete (notification prefs collected) AND notifications not paused.
 *
 * HARD BLOCK: Sending notifications before prefs collected = privacy violation
 *
 * @param client - Client record with onboardingState relation
 * @param clientSettings - ClientSettings record (contains notificationsPaused)
 * @returns GuardResult with allowed flag
 */
export function canSendNotification(client: ClientWithOnboarding, clientSettings: ClientSettings | null): GuardResult {
  // First check: onboarding complete (notification preferences collected)
  if (!isOnboardingComplete(client)) {
    console.warn(`[SystemGate] HARD BLOCK: canSendNotification - client ${client.id} onboarding incomplete`);
    return {
      allowed: false,
      reason: 'Onboarding incomplete - notification preferences not collected',
      blockType: 'HARD',
    };
  }

  // Second check: notifications not paused
  if (clientSettings?.notificationsPaused) {
    console.warn(`[SystemGate] HARD BLOCK: canSendNotification - client ${client.id} notifications paused`);
    return {
      allowed: false,
      reason: 'Notifications paused (vacation mode / testing)',
      blockType: 'HARD',
    };
  }

  return { allowed: true };
}

/**
 * GUARD 5: Should Use AI
 *
 * Checks if AI pipeline (OpenAI calls) should be used.
 * If false, system falls back to deterministic classification + static templates.
 *
 * SOFT FALLBACK: AI disabled → use keyword-based logic (system still responds)
 *
 * @param client - Client record with onboardingState and controls relations
 * @returns GuardResult with allowed flag
 */
export function shouldUseAI(client: ClientWithGuardData): GuardResult {
  if (client.controls?.aiDisabled) {
    console.warn(`[SystemGate] AI DISABLED: client ${client.id} using deterministic fallback`);
    console.warn(`  Reason: ${client.controls.aiDisabledReason || 'No reason provided'}`);
    return {
      allowed: false,
      reason: client.controls.aiDisabledReason || 'AI disabled (fail-safe mode / cost control)',
      blockType: 'SOFT', // System still responds, just without AI
    };
  }

  return { allowed: true };
}

/**
 * Logs a guard block for audit trail.
 * Called when a guard blocks an action.
 *
 * @param guardName - Name of the guard that blocked
 * @param clientId - Client ID
 * @param result - GuardResult with block details
 */
export function logGuardBlock(guardName: string, clientId: string, result: GuardResult): void {
  console.log(`[SystemGate] GUARD_BLOCK:`, {
    guard: guardName,
    clientId,
    reason: result.reason,
    blockType: result.blockType,
    timestamp: new Date().toISOString(),
  });

  // TODO: In production, persist to database for compliance/audit
  // await prisma.guardLog.create({
  //   data: { guardName, clientId, reason: result.reason, blockType: result.blockType }
  // });
}

/**
 * Helper: Get safe fallback message for incomplete onboarding.
 * Used when customer reaches out before client setup is complete.
 *
 * @param businessName - Business name (optional)
 * @returns Polite fallback message
 */
export function getOnboardingIncompleteMessage(businessName?: string): string {
  return businessName
    ? `Thank you for reaching out to ${businessName}! We're currently setting up our automated system. A team member will contact you shortly.`
    : "Thank you for your message. Our system is currently being set up. We'll be in touch soon!";
}

/**
 * COMPOSITE GUARD: Check All Customer Response Prerequisites
 *
 * Convenience method that combines multiple guards for customer response flow.
 * Use this in twilio.ts and inboundSmsPipeline.ts.
 *
 * @param client - Client record with onboardingState relation
 * @param clientSettings - ClientSettings record
 * @returns GuardResult with first blocking condition (if any)
 */
export function canProcessCustomerMessage(
  client: ClientWithOnboarding,
  clientSettings: ClientSettings | null
): GuardResult {
  // Check 1: Can respond at all?
  const canRespond = canRespondToCustomer(client);
  if (!canRespond.allowed) {
    logGuardBlock('canRespondToCustomer', client.id, canRespond);
    return canRespond;
  }

  // Check 2: Can send SMS?
  const canSend = canSendSMS(client);
  if (!canSend.allowed) {
    logGuardBlock('canSendSMS', client.id, canSend);
    return canSend;
  }

  // All checks passed
  return { allowed: true };
}

/**
 * COMPOSITE GUARD: Check All Booking Link Prerequisites
 *
 * Convenience method for booking link flow.
 * Use this in inboundSmsPipeline.ts before setting booking_link_enabled.
 *
 * @param client - Client record with onboardingState relation
 * @param hasBookingUrl - Whether booking URL is configured
 * @returns GuardResult with first blocking condition (if any)
 */
export function canProcessBookingRequest(
  client: ClientWithOnboarding,
  hasBookingUrl: boolean
): GuardResult {
  // Check 1: Can respond at all?
  const canRespond = canRespondToCustomer(client);
  if (!canRespond.allowed) {
    logGuardBlock('canRespondToCustomer', client.id, canRespond);
    return canRespond;
  }

  // Check 2: Can send booking link?
  const canBooking = canSendBookingLink(client, hasBookingUrl);
  if (!canBooking.allowed) {
    logGuardBlock('canSendBookingLink', client.id, canBooking);
    return canBooking;
  }

  // All checks passed
  return { allowed: true };
}

/**
 * COMPOSITE GUARD: Check All Notification Prerequisites
 *
 * Convenience method for notification flow.
 * Use this in NotificationService.ts and inboundSmsPipeline.ts.
 *
 * @param client - Client record with onboardingState relation
 * @param clientSettings - ClientSettings record
 * @returns GuardResult with first blocking condition (if any)
 */
export function canProcessNotificationRequest(
  client: ClientWithOnboarding,
  clientSettings: ClientSettings | null
): GuardResult {
  // Check: Can send notification?
  const canNotify = canSendNotification(client, clientSettings);
  if (!canNotify.allowed) {
    logGuardBlock('canSendNotification', client.id, canNotify);
    return canNotify;
  }

  // All checks passed
  return { allowed: true };
}
