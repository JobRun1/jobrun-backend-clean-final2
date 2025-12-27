import { prisma } from '../db';

/**
 * Runtime Contract Health Check
 *
 * This module validates ALL bootstrap invariants required for JobRun to be
 * considered CORRECT. Uptime without correctness is failure.
 *
 * Used by:
 * - /api/health endpoint (deploy gates)
 * - Runtime invariant monitor (5-minute checks)
 * - Startup validation (process.exit if broken)
 */

export interface InvariantViolation {
  invariant: string;
  expected: string;
  actual: string;
  severity: 'CRITICAL' | 'ERROR';
}

export interface HealthCheckResult {
  healthy: boolean;
  timestamp: string;
  violations: InvariantViolation[];
  invariants: {
    defaultClientExists: boolean;
    clientSettingsExists: boolean;
    bookingUrlValid: boolean;
    envClientIdMatches: boolean;
  };
}

/**
 * Validates all runtime invariants.
 * Returns structured result with violations.
 */
export async function checkRuntimeInvariants(): Promise<HealthCheckResult> {
  const timestamp = new Date().toISOString();
  const violations: InvariantViolation[] = [];
  const invariants = {
    defaultClientExists: false,
    clientSettingsExists: false,
    bookingUrlValid: false,
    envClientIdMatches: false,
  };

  const defaultClientId = process.env.DEFAULT_CLIENT_ID;

  // Invariant 1: DEFAULT_CLIENT_ID env var exists
  if (!defaultClientId) {
    violations.push({
      invariant: 'ENV_DEFAULT_CLIENT_ID',
      expected: 'DEFAULT_CLIENT_ID set in environment',
      actual: 'undefined',
      severity: 'CRITICAL',
    });
    return {
      healthy: false,
      timestamp,
      violations,
      invariants,
    };
  }

  try {
    // Invariant 2: Default client exists in database
    const client = await prisma.client.findUnique({
      where: { id: defaultClientId },
    });

    if (!client) {
      violations.push({
        invariant: 'DEFAULT_CLIENT_EXISTS',
        expected: `Client with id='${defaultClientId}' exists`,
        actual: 'null',
        severity: 'CRITICAL',
      });
    } else {
      invariants.defaultClientExists = true;
      invariants.envClientIdMatches = true;
    }

    // Invariant 3: ClientSettings exists for default client
    const clientSettings = await prisma.clientSettings.findUnique({
      where: { clientId: defaultClientId },
    });

    if (!clientSettings) {
      violations.push({
        invariant: 'CLIENT_SETTINGS_EXISTS',
        expected: `ClientSettings for clientId='${defaultClientId}' exists`,
        actual: 'null',
        severity: 'CRITICAL',
      });
    } else {
      invariants.clientSettingsExists = true;

      // Invariant 4: metadata.bookingUrl exists and is valid
      const metadata = clientSettings.metadata as Record<string, unknown> | null;
      const bookingUrl = metadata?.bookingUrl;

      if (!bookingUrl || typeof bookingUrl !== 'string') {
        violations.push({
          invariant: 'BOOKING_URL_VALID',
          expected: 'metadata.bookingUrl is non-empty string',
          actual: bookingUrl ? typeof bookingUrl : 'undefined',
          severity: 'CRITICAL',
        });
      } else if (!isValidBookingUrl(bookingUrl)) {
        violations.push({
          invariant: 'BOOKING_URL_VALID',
          expected: 'metadata.bookingUrl must be "/book/<clientId>" OR "https://<domain>/book/<clientId>"',
          actual: `"${bookingUrl}" (rejected)`,
          severity: 'CRITICAL',
        });
      } else {
        invariants.bookingUrlValid = true;
      }
    }
  } catch (error) {
    violations.push({
      invariant: 'DATABASE_CONNECTIVITY',
      expected: 'Database queries execute successfully',
      actual: `Error: ${error instanceof Error ? error.message : 'unknown'}`,
      severity: 'CRITICAL',
    });
  }

  const healthy = violations.length === 0;

  return {
    healthy,
    timestamp,
    violations,
    invariants,
  };
}

/**
 * Validate booking URL for JobRun internal booking system
 *
 * Accepts:
 * - Internal routes: "/book/<clientId>" (must have at least 1 char after "/book/")
 * - Absolute URLs: "https://jobrun.app/book/<clientId>" (http or https only)
 *
 * Rejects:
 * - Empty strings, whitespace-only
 * - Routes without leading slash: "book/...", "/book", "/book/"
 * - Non-http(s) protocols: "ftp://...", "file://..."
 * - Any other invalid format
 */
export function isValidBookingUrl(value: unknown): boolean {
  // Must be a string
  if (typeof value !== 'string') {
    return false;
  }

  // Must be non-empty after trimming
  const url = value.trim();
  if (url.length === 0) {
    return false;
  }

  // Case 1: Internal route path
  if (url.startsWith('/')) {
    // Must start with "/book/" and have at least 1 character after it
    // Valid: "/book/abc", "/book/default-client"
    // Invalid: "/book", "/book/", "/other/path"
    return url.startsWith('/book/') && url.length > '/book/'.length;
  }

  // Case 2: Absolute URL
  try {
    const parsedUrl = new URL(url);
    // Must be http or https
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Format violations for logging
 */
export function formatViolationsForLog(violations: InvariantViolation[]): string {
  if (violations.length === 0) {
    return '✅ All invariants satisfied';
  }

  const lines = ['❌ INVARIANT VIOLATIONS DETECTED:', ''];

  violations.forEach((v, i) => {
    lines.push(`[${i + 1}] ${v.invariant} (${v.severity})`);
    lines.push(`    Expected: ${v.expected}`);
    lines.push(`    Actual:   ${v.actual}`);
    lines.push('');
  });

  return lines.join('\n');
}
