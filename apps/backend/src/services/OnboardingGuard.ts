/**
 * PHASE 1 & 3: ONBOARDING ENFORCEMENT + VALIDATION
 *
 * Centralized service for:
 * 1. Enforcing onboarding completion gates
 * 2. Validating onboarding requirements before marking complete
 * 3. Safely transitioning clients to production-ready state
 *
 * Prevents incomplete clients from triggering automation that could:
 * - Send booking links without proper setup
 * - Notify businesses that haven't confirmed notification preferences
 * - Process customers before call forwarding is configured
 *
 * PHILOSOPHY: Respond politely, log everything, but DO NOT trigger downstream automation.
 * CRITICAL: onboardingComplete is DERIVED from OnboardingState.currentState === 'COMPLETE'.
 */

import { Client, OnboardingState } from '@prisma/client';
import { prisma } from '../db';
import { ClientWithOnboarding, isOnboardingComplete } from '../utils/onboardingUtils';

/**
 * Required fields for onboarding completion.
 * These fields MUST be populated before automation is enabled.
 */
export interface OnboardingRequirements {
  businessName: boolean;           // Client identity
  phoneNumber: boolean;             // Owner contact (for notifications)
  twilioNumber: boolean;            // Dedicated inbound number assigned
  forwardingEnabled: boolean;       // Call forwarding confirmed via test call
  notificationPreferences: boolean; // How to notify owner (from collectedFields)
}

/**
 * Result of onboarding validation check.
 */
export interface OnboardingCheckResult {
  isComplete: boolean;
  missingRequirements: string[];
  requirementDetails: OnboardingRequirements;
}

/**
 * Validates whether a client has completed ALL required onboarding steps.
 *
 * This is the SINGLE SOURCE OF TRUTH for onboarding completion logic.
 *
 * @param client - Client record from database
 * @param onboardingState - OnboardingState record (if exists)
 * @returns Validation result with missing requirements
 */
export function validateOnboardingComplete(
  client: Client,
  onboardingState: OnboardingState | null
): OnboardingCheckResult {
  const requirements: OnboardingRequirements = {
    businessName: !!client.businessName && client.businessName.trim().length > 0,
    phoneNumber: !!client.phoneNumber && client.phoneNumber.trim().length > 0,
    twilioNumber: !!client.twilioNumber && client.twilioNumber.trim().length > 0,
    forwardingEnabled: onboardingState?.forwardingEnabled === true,
    notificationPreferences: hasNotificationPreferences(onboardingState),
  };

  const missingRequirements: string[] = [];

  if (!requirements.businessName) missingRequirements.push('businessName');
  if (!requirements.phoneNumber) missingRequirements.push('phoneNumber (owner contact)');
  if (!requirements.twilioNumber) missingRequirements.push('twilioNumber (dedicated number)');
  if (!requirements.forwardingEnabled) missingRequirements.push('forwardingEnabled (test call not confirmed)');
  if (!requirements.notificationPreferences) missingRequirements.push('notificationPreferences');

  const isComplete = missingRequirements.length === 0
    && onboardingState?.currentState === 'COMPLETE';

  return {
    isComplete,
    missingRequirements,
    requirementDetails: requirements,
  };
}

/**
 * Checks if client has valid notification preferences collected during onboarding.
 */
function hasNotificationPreferences(onboardingState: OnboardingState | null): boolean {
  if (!onboardingState || !onboardingState.collectedFields) return false;

  try {
    const fields = onboardingState.collectedFields as any;
    // Check if notificationPref field exists and is non-empty
    return typeof fields.notificationPref === 'string' && fields.notificationPref.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * GUARD: Checks if client is allowed to send booking links.
 *
 * BLOCKS if onboarding incomplete.
 * Logs reason for blocking.
 *
 * @param client - Client record with onboardingState relation
 * @returns true if allowed, false if blocked
 */
export function canSendBookingLink(client: ClientWithOnboarding): boolean {
  if (!isOnboardingComplete(client)) {
    console.warn(`[OnboardingGuard] BLOCKED booking link for client ${client.id} - onboarding incomplete`);
    return false;
  }
  return true;
}

/**
 * GUARD: Checks if client is allowed to send business owner notifications.
 *
 * BLOCKS if onboarding incomplete (notification preferences not collected).
 * Logs reason for blocking.
 *
 * @param client - Client record with onboardingState relation
 * @returns true if allowed, false if blocked
 */
export function canSendNotification(client: ClientWithOnboarding): boolean {
  if (!isOnboardingComplete(client)) {
    console.warn(`[OnboardingGuard] BLOCKED notification for client ${client.id} - onboarding incomplete`);
    return false;
  }
  return true;
}

/**
 * GUARD: Checks if client is allowed to process customer job pipeline.
 *
 * Returns safe fallback message if onboarding incomplete.
 * Customer still gets a polite response, but NO automation is triggered.
 *
 * @param client - Client record with onboardingState relation
 * @returns Object with allowed flag and fallback message
 */
export function canProcessCustomerPipeline(client: ClientWithOnboarding): {
  allowed: boolean;
  fallbackMessage?: string;
} {
  if (!isOnboardingComplete(client)) {
    console.warn(`[OnboardingGuard] BLOCKED customer pipeline for client ${client.id} - onboarding incomplete`);
    return {
      allowed: false,
      fallbackMessage: "Thank you for your message. Our system is currently being set up. We'll be in touch soon!"
    };
  }
  return { allowed: true };
}

/**
 * Generates a polite SMS response for customers when onboarding is incomplete.
 * This ensures customers always get a response, even if automation is blocked.
 */
export function getIncompleteOnboardingCustomerMessage(businessName?: string): string {
  const name = businessName || "our team";
  return `Thank you for reaching out to ${name}! We're currently setting up our automated system. A team member will contact you shortly.`;
}

/**
 * PHASE 3: COMPLETE ONBOARDING (SAFE TRANSITION)
 *
 * Validates ALL onboarding requirements and marks client as production-ready.
 * This sets OnboardingState.currentState = 'COMPLETE'.
 *
 * CRITICAL: onboardingComplete is DERIVED from OnboardingState.currentState, not stored in Client.
 *
 * @param clientId - Client ID to mark complete
 * @returns Validation result with success flag and any errors
 * @throws Error if validation fails or database write fails
 */
export async function completeOnboarding(clientId: string): Promise<{
  success: boolean;
  errors?: string[];
  client?: Client;
}> {
  try {
    // Fetch client and onboarding state with relation
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { onboardingState: true },
    });

    if (!client) {
      return {
        success: false,
        errors: ['Client not found'],
      };
    }

    // Check if already complete
    if (isOnboardingComplete(client as ClientWithOnboarding)) {
      console.log(`[OnboardingGuard] Client ${clientId} already marked complete`);
      return {
        success: true,
        client,
      };
    }

    const onboardingState = client.onboardingState;

    // Validate ALL requirements
    const validation = validateOnboardingComplete(client, onboardingState);

    if (!validation.isComplete) {
      console.warn(`[OnboardingGuard] VALIDATION FAILED for client ${clientId}:`, validation.missingRequirements);
      return {
        success: false,
        errors: validation.missingRequirements,
      };
    }

    // ALL CHECKS PASSED - Mark onboarding state as complete
    if (onboardingState) {
      await prisma.onboardingState.update({
        where: { clientId },
        data: {
          currentState: 'COMPLETE',
          completedAt: new Date(),
        },
      });

      console.log(`✅ [OnboardingGuard] Client ${clientId} marked COMPLETE`);
    }

    return {
      success: true,
      client,
    };

  } catch (error) {
    console.error(`❌ [OnboardingGuard] Error completing onboarding for client ${clientId}:`, error);
    return {
      success: false,
      errors: [`Database error: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

/**
 * PHASE 3: VALIDATE ONBOARDING COMPLETION (ENHANCED)
 *
 * Extended version that validates against OnboardingState fields.
 * Ensures onboarding state is in COMPLETE and all flags are set.
 *
 * @param clientId - Client ID
 * @param onboardingStateId - OnboardingState ID (optional)
 * @returns Validation result with detailed errors
 */
export async function validateOnboardingCompleteEnhanced(
  clientId: string,
  onboardingStateId?: string
): Promise<OnboardingCheckResult> {
  // Fetch client
  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    return {
      isComplete: false,
      missingRequirements: ['Client not found'],
      requirementDetails: {
        businessName: false,
        phoneNumber: false,
        twilioNumber: false,
        forwardingEnabled: false,
        notificationPreferences: false,
      },
    };
  }

  // Fetch onboarding state (by clientId OR by id)
  let onboardingState: OnboardingState | null = null;

  if (onboardingStateId) {
    onboardingState = await prisma.onboardingState.findUnique({
      where: { id: onboardingStateId },
    });
  } else {
    onboardingState = await prisma.onboardingState.findUnique({
      where: { clientId },
    });
  }

  // Validate using existing logic
  return validateOnboardingComplete(client, onboardingState);
}
