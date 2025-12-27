/**
 * OPENAI FAILURE TRACKER
 *
 * Tracks consecutive OpenAI extraction failures to detect system-wide issues.
 *
 * ALERT TRIGGER:
 * - 5 consecutive failures within 15 minutes = HIGH severity alert
 *
 * RESET LOGIC:
 * - Any successful extraction resets counter
 * - Counter auto-resets after 15 minutes
 */

import { AlertService, AlertTemplates } from "./AlertService";

interface FailureRecord {
  timestamp: Date;
  error: string;
}

class OpenAIFailureTrackerClass {
  private failures: FailureRecord[] = [];
  private readonly MAX_FAILURES = 5; // Alert threshold
  private readonly WINDOW_MINUTES = 15; // Time window for counting failures
  private alerted = false; // Prevent repeated alerts for same failure batch

  /**
   * Record a successful extraction (resets failure counter)
   */
  recordSuccess(): void {
    if (this.failures.length > 0) {
      console.log(`[OPENAI_TRACKER] Success after ${this.failures.length} failures - resetting counter`);
      this.failures = [];
      this.alerted = false;
    }
  }

  /**
   * Record a failed extraction
   */
  async recordFailure(error: string): Promise<void> {
    const now = new Date();

    // Add failure to history
    this.failures.push({ timestamp: now, error });

    // Clean up old failures outside time window
    this.cleanupOldFailures();

    console.log(`[OPENAI_TRACKER] Failure recorded (${this.failures.length}/${this.MAX_FAILURES} in ${this.WINDOW_MINUTES}min window)`);

    // Check if threshold exceeded
    if (this.failures.length >= this.MAX_FAILURES && !this.alerted) {
      console.error(`[OPENAI_TRACKER] ❌ THRESHOLD EXCEEDED - ${this.failures.length} failures in ${this.WINDOW_MINUTES} minutes`);

      // Send critical alert
      await AlertService.sendCriticalAlert(
        AlertTemplates.openaiFailure(this.failures.length, `${this.WINDOW_MINUTES} minutes`)
      );

      this.alerted = true; // Prevent repeated alerts
    }
  }

  /**
   * Remove failures older than time window
   */
  private cleanupOldFailures(): void {
    const now = new Date();
    const windowMs = this.WINDOW_MINUTES * 60 * 1000;

    const before = this.failures.length;
    this.failures = this.failures.filter((f) => {
      const age = now.getTime() - f.timestamp.getTime();
      return age < windowMs;
    });

    // If failures cleared due to age, reset alert flag
    if (this.failures.length === 0 && before > 0) {
      this.alerted = false;
    }
  }

  /**
   * Get current failure count
   */
  getFailureCount(): number {
    this.cleanupOldFailures();
    return this.failures.length;
  }

  /**
   * Reset tracker (for testing or manual intervention)
   */
  reset(): void {
    console.log("[OPENAI_TRACKER] Manual reset");
    this.failures = [];
    this.alerted = false;
  }
}

// Singleton instance
export const OpenAIFailureTracker = new OpenAIFailureTrackerClass();
