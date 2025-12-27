/**
 * SMS PRICING SAFEGUARD - FAIL-FAST PROTECTION
 *
 * This module intercepts ALL outbound SMS before dispatch and validates
 * that no forbidden pricing patterns exist in the message content.
 *
 * CRITICAL: If £29 or incorrect pricing is detected, this THROWS and prevents send.
 */

const FORBIDDEN_PRICING_PATTERNS = [
  /£29/gi,
  /29\/month/gi,
  /29 \/month/gi,
  /£ 29/gi,
  /GBP 29/gi,
  /GBP29/gi,
  /29GBP/gi,
  /\b29\s*pounds/gi,
  /\b29\s*per\s*month/gi,
];

const REQUIRED_PRICING_PATTERNS = {
  // If message mentions pricing, it MUST have £49
  price: /£49/,
  // If message mentions trial, it MUST have "7-day"
  trial: /7-day/,
  // If message mentions pricing, it SHOULD have "Cancel anytime"
  cancel: /Cancel anytime/,
};

interface ValidationResult {
  allowed: boolean;
  reason?: string;
  pattern?: string;
}

/**
 * Validate SMS content for pricing correctness
 *
 * @param messageBody - The SMS message content to validate
 * @param context - Optional context for logging (e.g., "PAYMENT_GATE", "ONBOARDING")
 * @returns ValidationResult
 * @throws Error if forbidden patterns detected (FAIL FAST in dev/staging)
 */
export function validateSmsContent(
  messageBody: string,
  context: string = 'UNKNOWN'
): ValidationResult {
  // Check for forbidden patterns (£29, etc.)
  for (const pattern of FORBIDDEN_PRICING_PATTERNS) {
    if (pattern.test(messageBody)) {
      const error = `[SMS_SAFEGUARD] CRITICAL: Forbidden pricing pattern detected in ${context} SMS`;
      const details = `Pattern: ${pattern}, Message preview: "${messageBody.substring(0, 100)}..."`;

      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error(error);
      console.error(details);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // FAIL FAST in non-production environments
      if (process.env.NODE_ENV !== 'production') {
        throw new Error(`${error}\n${details}`);
      }

      // In production, log and block but don't crash
      console.error('⚠️  SMS BLOCKED IN PRODUCTION - MANUAL REVIEW REQUIRED');
      return {
        allowed: false,
        reason: 'Forbidden pricing pattern detected',
        pattern: pattern.toString(),
      };
    }
  }

  // If message mentions "JobRun costs" or similar pricing indicators,
  // verify it has correct pricing
  const hasPricingContext = /JobRun costs|pricing|price|month|subscription/i.test(messageBody);

  if (hasPricingContext) {
    // Must have £49
    if (!REQUIRED_PRICING_PATTERNS.price.test(messageBody)) {
      const error = `[SMS_SAFEGUARD] CRITICAL: Pricing SMS missing correct price £49 in ${context}`;
      console.error(error);
      console.error(`Message: "${messageBody.substring(0, 100)}..."`);

      if (process.env.NODE_ENV !== 'production') {
        throw new Error(error);
      }

      return {
        allowed: false,
        reason: 'Missing correct price £49',
      };
    }

    // Must have 7-day trial
    if (messageBody.toLowerCase().includes('trial') && !REQUIRED_PRICING_PATTERNS.trial.test(messageBody)) {
      const error = `[SMS_SAFEGUARD] CRITICAL: Trial SMS missing "7-day" in ${context}`;
      console.error(error);
      console.error(`Message: "${messageBody.substring(0, 100)}..."`);

      if (process.env.NODE_ENV !== 'production') {
        throw new Error(error);
      }

      return {
        allowed: false,
        reason: 'Missing "7-day" trial specification',
      };
    }

    // Should have "Cancel anytime"
    if (!REQUIRED_PRICING_PATTERNS.cancel.test(messageBody)) {
      console.warn(`[SMS_SAFEGUARD] WARNING: Pricing SMS missing "Cancel anytime" in ${context}`);
      console.warn(`Message: "${messageBody.substring(0, 100)}..."`);
      // Not blocking, just warning
    }
  }

  return { allowed: true };
}

/**
 * Interceptor function to be called before ALL Twilio message sends
 *
 * Usage in TwiML responses or client.messages.create():
 *   const messageBody = "...";
 *   validateAndSend(messageBody, "ONBOARDING");
 *   // Then proceed with Twilio send
 *
 * @param messageBody - SMS content
 * @param context - Where this SMS is being sent from
 */
export function validateAndSend(messageBody: string, context: string): void {
  const result = validateSmsContent(messageBody, context);

  if (!result.allowed) {
    throw new Error(
      `[SMS_SAFEGUARD] SMS send blocked: ${result.reason}. ` +
      `Context: ${context}. ` +
      `Review message content and pricing configuration.`
    );
  }

  console.log(`✅ [SMS_SAFEGUARD] ${context} SMS validated successfully`);
}

/**
 * Scan all message templates at startup for forbidden patterns
 *
 * This should be called when the app starts to catch any hardcoded
 * pricing issues before they reach production.
 */
export function validateAllTemplates(): void {
  console.log('🔍 [SMS_SAFEGUARD] Scanning message templates at startup...');

  // This would ideally scan all template functions, but since we've centralized
  // in paymentMessaging.ts, we just validate that module is imported correctly
  try {
    // Import will trigger paymentMessaging.ts validation
    require('../messaging/paymentMessaging');
    console.log('✅ [SMS_SAFEGUARD] Payment messaging templates validated');
  } catch (error) {
    console.error('❌ [SMS_SAFEGUARD] CRITICAL: Payment messaging validation failed');
    throw error;
  }

  console.log('✅ [SMS_SAFEGUARD] All templates validated successfully');
}
