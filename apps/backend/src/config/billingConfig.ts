/**
 * TIER 3 PHASE 3: BILLING LIFECYCLE CONSTANTS (TIME AUTHORITY)
 *
 * Single source of truth for ALL billing time-based rules.
 *
 * DESIGN PRINCIPLES:
 * - Time drives state, not requests
 * - No magic numbers scattered in code
 * - All durations in this file ONLY
 * - Clear documentation for each constant
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TRIAL LIFECYCLE CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Trial duration in days.
 *
 * When trial starts: TRIAL_PENDING → TRIAL_ACTIVE
 * When trial expires: TRIAL_ACTIVE → TRIAL_EXPIRED
 *
 * DEFAULT: 7 days
 */
export const TRIAL_DURATION_DAYS = 7;

/**
 * Trial start trigger.
 *
 * EXPLICIT RULE: Trial starts when onboarding completes (OnboardingState.currentState = COMPLETE)
 *
 * WHY: We want clients fully set up (call forwarding, phone number allocated) before starting trial clock.
 *
 * IMPLEMENTATION:
 * - OnboardingService calls startTrial() when transitioning to COMPLETE
 * - Sets trialStartedAt, trialEndsAt, trialUsedAt
 * - Transitions TRIAL_PENDING → TRIAL_ACTIVE
 */
export const TRIAL_START_TRIGGER = "ONBOARDING_COMPLETE" as const;

/**
 * Trial expiration behavior.
 *
 * When trialEndsAt < NOW and status = TRIAL_ACTIVE:
 * - Transition to TRIAL_EXPIRED
 * - Block outbound SMS (isPaymentValid returns false)
 * - Show payment prompt on next inbound SMS
 * - Alert ops (once, via AlertService)
 */
export const TRIAL_EXPIRATION_BEHAVIOR = {
  transition: "TRIAL_EXPIRED" as const,
  blockOutbound: true,
  showPaymentPrompt: true,
  alertOps: true,
  alertOnce: true, // Don't spam ops with repeated alerts
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DELINQUENCY LIFECYCLE CONSTANTS (STUB FOR PHASE 4)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Grace period after payment failure.
 *
 * When payment fails (Stripe webhook): ACTIVE → DELINQUENT
 * After grace period expires: DELINQUENT → CANCELED
 *
 * DEFAULT: 3 days
 *
 * ⚠️ PHASE 4 ONLY — NOT IMPLEMENTED YET
 * TODO: Implement delinquency sweep job in PHASE 4
 */
export const DELINQUENCY_GRACE_PERIOD_DAYS = 3;

/**
 * Number of payment retry attempts before canceling.
 *
 * DEFAULT: 3 attempts
 *
 * ⚠️ PHASE 4 ONLY — NOT IMPLEMENTED YET
 * TODO: Implement retry logic in Stripe webhook handler
 */
export const DELINQUENCY_MAX_RETRY_ATTEMPTS = 3;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CRON JOB INTERVALS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * How often to run trial expiration sweep.
 *
 * Recommended: Every 1 hour (catches expirations within 1 hour of trialEndsAt)
 *
 * Safety: Idempotent — safe to run multiple times
 */
export const TRIAL_EXPIRATION_SWEEP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * How often to run delinquency sweep.
 *
 * Recommended: Every 6 hours
 *
 * ⚠️ PHASE 4 ONLY — NOT IMPLEMENTED YET
 */
export const DELINQUENCY_SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  NOTIFICATION TIMING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * When to send trial expiration warning (days before expiration).
 *
 * DEFAULT: 1 day before expiration
 *
 * ⚠️ PHASE 4 ONLY — NOT IMPLEMENTED YET
 * TODO: Implement notification job
 */
export const TRIAL_WARNING_DAYS_BEFORE_EXPIRATION = 1;

/**
 * When to send delinquency warning (days before cancellation).
 *
 * DEFAULT: 1 day before grace period ends
 *
 * ⚠️ PHASE 4 ONLY — NOT IMPLEMENTED YET
 */
export const DELINQUENCY_WARNING_DAYS_BEFORE_CANCELLATION = 1;
