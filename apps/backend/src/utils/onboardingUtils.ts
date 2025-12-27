/**
 * ONBOARDING UTILITIES
 *
 * Helper functions for working with client onboarding state.
 *
 * CRITICAL: onboardingComplete is DERIVED, not stored in the Client model.
 * This prevents schema drift and ensures a single source of truth.
 */

import { Client, OnboardingState } from '@prisma/client';
import { prisma } from '../db';

/**
 * Type for Client with onboardingState relation included
 */
export type ClientWithOnboarding = Client & {
  onboardingState?: OnboardingState | null;
};

/**
 * Derives onboardingComplete from OnboardingState
 *
 * Logic:
 * - If OnboardingState exists and currentState === 'COMPLETE' → true
 * - Otherwise → false
 *
 * @param client - Client record with optional onboardingState relation
 * @returns true if onboarding is complete, false otherwise
 */
export function isOnboardingComplete(client: ClientWithOnboarding): boolean {
  return client.onboardingState?.currentState === 'COMPLETE';
}

/**
 * Fetches client with onboardingState and returns onboardingComplete flag
 *
 * Use this when you only have a Client record without the relation loaded.
 *
 * @param clientId - Client ID
 * @returns true if onboarding is complete, false otherwise
 */
export async function getOnboardingComplete(clientId: string): Promise<boolean> {
  const onboardingState = await prisma.onboardingState.findUnique({
    where: { clientId },
  });

  return onboardingState?.currentState === 'COMPLETE' || false;
}
