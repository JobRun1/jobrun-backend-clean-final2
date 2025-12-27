/**
 * PHONE NORMALIZATION & VALIDATION UTILITY
 *
 * Single source of truth for phone number processing.
 * Replaces scattered normalization logic across the codebase.
 *
 * SAFETY:
 * - Validates E.164 format
 * - Logs normalization failures
 * - Never returns invalid numbers
 * - Explicit error reporting
 */

export interface PhoneValidationResult {
  valid: boolean;
  normalized: string | null;
  error?: string;
}

/**
 * Validate and normalize phone number to E.164 format
 *
 * Accepts:
 * - E.164 format: +447476955179
 * - UK mobile without +: 07476955179
 * - UK mobile without +44: 7476955179
 *
 * Returns:
 * - valid: true if phone number is valid
 * - normalized: E.164 string (+447476955179) or null
 * - error: description of validation failure
 *
 * @param input - Raw phone number input
 * @param countryCode - Default country code (default: '44' for UK)
 * @returns PhoneValidationResult
 */
export function validateAndNormalizePhone(
  input: string | null | undefined,
  countryCode: string = '44'
): PhoneValidationResult {
  // Step 1: Check for null/undefined/empty
  if (!input || typeof input !== 'string') {
    return {
      valid: false,
      normalized: null,
      error: 'Phone number is null, undefined, or empty',
    };
  }

  // Step 2: Remove all non-digit characters
  const digits = input.replace(/\D/g, '');

  if (digits.length === 0) {
    return {
      valid: false,
      normalized: null,
      error: 'Phone number contains no digits',
    };
  }

  // Step 3: Build E.164 number
  let e164: string;

  if (digits.startsWith(countryCode)) {
    // Already has country code (without +)
    // Example: 447476955179 → +447476955179
    e164 = `+${digits}`;
  } else if (digits.startsWith('0')) {
    // UK format with leading 0
    // Example: 07476955179 → +447476955179
    e164 = `+${countryCode}${digits.substring(1)}`;
  } else {
    // Assume missing country code
    // Example: 7476955179 → +447476955179
    e164 = `+${countryCode}${digits}`;
  }

  // Step 4: Validate E.164 format
  // E.164: +[country code][number]
  // Length: 10-15 digits (excluding +)
  const e164Regex = /^\+\d{10,15}$/;

  if (!e164Regex.test(e164)) {
    return {
      valid: false,
      normalized: null,
      error: `Invalid E.164 format: ${e164} (expected +[country][10-15 digits])`,
    };
  }

  // Step 5: Validate UK-specific format (if country code is 44)
  if (e164.startsWith('+44')) {
    // UK mobile numbers: +447[9 digits]
    // UK landlines: +441[9-10 digits] or +442[9-10 digits]
    const ukMobileRegex = /^\+447\d{9}$/;
    const ukLandlineRegex = /^\+44(1|2)\d{9,10}$/;

    if (!ukMobileRegex.test(e164) && !ukLandlineRegex.test(e164)) {
      console.warn(`[PhoneUtils] UK number doesn't match expected pattern: ${e164}`);
      // Still allow it (may be valid UK number with different prefix)
    }
  }

  // Success
  return {
    valid: true,
    normalized: e164,
  };
}

/**
 * Normalize phone number (throws on invalid)
 *
 * Use this when you expect the phone number to be valid and want to fail loudly.
 *
 * @param input - Raw phone number
 * @param countryCode - Default country code
 * @returns Normalized E.164 phone number
 * @throws Error if phone number is invalid
 */
export function normalizePhone(input: string, countryCode: string = '44'): string {
  const result = validateAndNormalizePhone(input, countryCode);

  if (!result.valid) {
    console.error(`[PhoneUtils] INVALID PHONE NUMBER: ${input} - ${result.error}`);
    throw new Error(`Invalid phone number: ${result.error}`);
  }

  return result.normalized!;
}

/**
 * Safely normalize phone number (returns null on invalid)
 *
 * Use this when phone number might be invalid and you want graceful degradation.
 *
 * @param input - Raw phone number
 * @param countryCode - Default country code
 * @returns Normalized E.164 phone number or null
 */
export function safeNormalizePhone(
  input: string | null | undefined,
  countryCode: string = '44'
): string | null {
  const result = validateAndNormalizePhone(input, countryCode);

  if (!result.valid) {
    console.warn(`[PhoneUtils] Failed to normalize phone: ${input} - ${result.error}`);
    return null;
  }

  return result.normalized;
}
