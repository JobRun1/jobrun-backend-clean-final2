/**
 * PRICING CONFIGURATION - SINGLE SOURCE OF TRUTH
 *
 * This is the ONLY place where pricing and trial terms are defined.
 * All messaging, SMS templates, and UI MUST reference this file.
 *
 * FINALIZED PRICING (2024-12-23):
 * - £49 per month
 * - 7-day free trial
 * - Cancel anytime
 *
 * DO NOT hard-code pricing anywhere else in the codebase.
 */

export const PRICING_CONFIG = {
  /**
   * Monthly subscription price in pence (GBP)
   */
  monthlyPricePence: 4900,

  /**
   * Monthly subscription price in pounds (GBP) for display
   */
  monthlyPrice: 49,

  /**
   * Currency code (ISO 4217)
   */
  currency: 'GBP' as const,

  /**
   * Currency symbol for display
   */
  currencySymbol: '£',

  /**
   * Trial period in days
   */
  trialDays: 7,

  /**
   * Whether subscription can be cancelled at any time
   */
  cancelAnytime: true,

  /**
   * Formatted pricing string for SMS and display
   * Example: "£49/month"
   */
  get formattedPrice(): string {
    return `${this.currencySymbol}${this.monthlyPrice}/month`;
  },

  /**
   * Formatted trial period for SMS and display
   * Example: "7-day free trial"
   */
  get formattedTrial(): string {
    return `${this.trialDays}-day free trial`;
  },

  /**
   * Complete pricing summary for payment gate
   * Example: "£49/month after a 7-day free trial. Cancel anytime."
   */
  get pricingSummary(): string {
    const parts = [
      `${this.formattedPrice} after a ${this.formattedTrial}`,
    ];

    if (this.cancelAnytime) {
      parts.push('Cancel anytime');
    }

    return parts.join('. ') + '.';
  },

  /**
   * Short pricing statement for inline use
   * Example: "£49/month (7-day free trial, cancel anytime)"
   */
  get shortPricing(): string {
    const details = [this.formattedTrial];
    if (this.cancelAnytime) {
      details.push('Cancel anytime');
    }
    return `${this.formattedPrice} (${details.join(', ')})`;
  },
} as const;

/**
 * Validate pricing configuration on import
 * Ensures configuration is correctly set up
 */
function validatePricingConfig(): void {
  if (PRICING_CONFIG.monthlyPrice <= 0) {
    throw new Error('[PRICING_CONFIG] monthlyPrice must be positive');
  }

  if (PRICING_CONFIG.trialDays < 0) {
    throw new Error('[PRICING_CONFIG] trialDays cannot be negative');
  }

  if (PRICING_CONFIG.monthlyPricePence !== PRICING_CONFIG.monthlyPrice * 100) {
    throw new Error('[PRICING_CONFIG] monthlyPricePence must equal monthlyPrice * 100');
  }

  console.log('✅ [PRICING_CONFIG] Validated:', {
    price: PRICING_CONFIG.formattedPrice,
    trial: PRICING_CONFIG.formattedTrial,
    cancelAnytime: PRICING_CONFIG.cancelAnytime,
  });
}

// Run validation on module load
validatePricingConfig();
