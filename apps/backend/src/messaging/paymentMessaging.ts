/**
 * PAYMENT & PRICING MESSAGING - SINGLE SOURCE OF TRUTH
 *
 * This is the ONLY module that generates payment and pricing-related SMS messages.
 * ALL pricing messages MUST come from this file.
 *
 * CRITICAL: DO NOT create pricing messages anywhere else in the codebase.
 */

import { PRICING_CONFIG } from '../config/pricingConfig';

/**
 * Payment activation message sent at onboarding payment gate (S5_CONFIRM_LIVE)
 *
 * Used when:
 * - Client reaches S5_CONFIRM_LIVE state
 * - billing.status is not TRIAL_ACTIVE or ACTIVE
 * - NOT trial exhausted
 *
 * @returns SMS message body
 */
export function getPaymentActivationMessage(): string {
  const stripeUrl = process.env.STRIPE_CHECKOUT_URL || 'https://buy.stripe.com/test_PLACEHOLDER';

  return `Perfect! One last step before we go live.

JobRun costs ${PRICING_CONFIG.pricingSummary}

To activate, confirm payment here:
${stripeUrl}

Reply READY once you've confirmed.`;
}

/**
 * Trial already used message (cannot use free trial again)
 *
 * Used when:
 * - Client reaches S5_CONFIRM_LIVE
 * - trialUsedAt IS NOT NULL (trial already consumed)
 *
 * @param paymentUrl - Direct payment link (no trial eligible)
 * @returns SMS message body
 */
export function getTrialUsedMessage(paymentUrl: string): string {
  return `This phone number has already used a JobRun trial.

Trial eligibility is one per phone number.

To activate, visit:
${paymentUrl}`;
}

/**
 * Payment reminder for incomplete activation
 *
 * Used when:
 * - Client previously saw payment gate
 * - Has not completed payment
 * - Retrying onboarding
 *
 * @returns SMS message body
 */
export function getPaymentReminderMessage(): string {
  return `To activate JobRun, please complete payment.

Pricing: ${PRICING_CONFIG.pricingSummary}

Once confirmed, reply READY.`;
}

/**
 * Get pricing summary for inline use (no call to action)
 *
 * Used when:
 * - Need to mention pricing in informational context
 * - Part of larger message
 *
 * @returns Pricing summary string
 */
export function getPricingSummary(): string {
  return PRICING_CONFIG.pricingSummary;
}

/**
 * Get short pricing for quick reference
 *
 * @returns Short pricing format
 */
export function getShortPricing(): string {
  return PRICING_CONFIG.shortPricing;
}

/**
 * Runtime validation: Ensure no pricing messages contain incorrect prices
 *
 * This function is called at module load to validate all message templates.
 * If any message contains £29 or 29/month, it FAILS FAST.
 */
function validatePricingMessages(): void {
  // All messages must be checked for forbidden patterns
  const allMessages = [
    { name: 'PaymentActivation', content: getPaymentActivationMessage(), requiresPricing: true },
    { name: 'TrialUsed', content: getTrialUsedMessage('https://example.com'), requiresPricing: false },
    { name: 'PaymentReminder', content: getPaymentReminderMessage(), requiresPricing: true },
    { name: 'PricingSummary', content: getPricingSummary(), requiresPricing: true },
    { name: 'ShortPricing', content: getShortPricing(), requiresPricing: true },
  ];

  const FORBIDDEN_PATTERNS = [
    '£29',
    '29/month',
    '29 /month',
    '£ 29',
    'GBP 29',
    'GBP29',
  ];

  for (const msg of allMessages) {
    // ALL messages must NOT have forbidden patterns
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (msg.content.includes(pattern)) {
        throw new Error(
          `[PRICING_VALIDATION] CRITICAL: ${msg.name} message contains forbidden pattern "${pattern}". ` +
          `This indicates incorrect pricing configuration. ` +
          `Message: "${msg.content.substring(0, 100)}..."`
        );
      }
    }

    // Only messages that show pricing need to have £49, 7-day, Cancel anytime
    if (msg.requiresPricing) {
      if (!msg.content.includes('£49')) {
        throw new Error(
          `[PRICING_VALIDATION] CRITICAL: ${msg.name} message does not contain correct price £49. ` +
          `Message: "${msg.content.substring(0, 100)}..."`
        );
      }

      if (!msg.content.includes('7-day')) {
        throw new Error(
          `[PRICING_VALIDATION] CRITICAL: ${msg.name} message does not mention 7-day trial. ` +
          `Message: "${msg.content.substring(0, 100)}..."`
        );
      }

      if (!msg.content.includes('Cancel anytime')) {
        throw new Error(
          `[PRICING_VALIDATION] CRITICAL: ${msg.name} message does not mention "Cancel anytime". ` +
          `Message: "${msg.content.substring(0, 100)}..."`
        );
      }
    }
  }

  console.log('✅ [PRICING_VALIDATION] All payment messages validated successfully');
  console.log(`   - Forbidden patterns checked: ${FORBIDDEN_PATTERNS.join(', ')}`);
  console.log(`   - Pricing messages verified: £49, 7-day, Cancel anytime`);
}

// Run validation on module load (FAIL FAST if incorrect)
validatePricingMessages();
