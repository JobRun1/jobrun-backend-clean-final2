/**
 * Minimal Production Metrics
 *
 * Tracks ONLY the metrics required to prove:
 * 1. Startup success
 * 2. Bootstrap failures
 * 3. Twilio webhook execution
 * 4. AI pipeline success/failure
 *
 * No over-engineering. No dashboards. Just counters and timings.
 */

interface MetricsSnapshot {
  timestamp: string;
  counters: Record<string, number>;
  timings: Record<string, { count: number; totalMs: number; avgMs: number }>;
}

type Labels = Record<string, string | number>;

class MetricsService {
  private counters: Map<string, number> = new Map();
  private timings: Map<string, number[]> = new Map();

  /**
   * Increment a counter with optional labels
   * Labels are appended to metric name for simplicity
   */
  increment(metric: string, valueOrLabels?: number | Labels, value: number = 1): void {
    let actualValue = value;
    let labels: Labels | undefined;

    // Handle overloaded parameters
    if (typeof valueOrLabels === 'number') {
      actualValue = valueOrLabels;
    } else if (valueOrLabels) {
      labels = valueOrLabels;
    }

    // Build metric key with labels
    const metricKey = labels ? this.buildMetricKey(metric, labels) : metric;

    const current = this.counters.get(metricKey) || 0;
    this.counters.set(metricKey, current + actualValue);
  }

  /**
   * Build metric key with labels (Prometheus-style)
   * Example: conversation.created{mode="OPERATIONAL"}
   */
  private buildMetricKey(metric: string, labels: Labels): string {
    const labelPairs = Object.entries(labels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    return `${metric}{${labelPairs}}`;
  }

  /**
   * Record a timing (in milliseconds)
   */
  timing(metric: string, durationMs: number): void {
    const timings = this.timings.get(metric) || [];
    timings.push(durationMs);
    this.timings.set(metric, timings);
  }

  /**
   * Get current metrics snapshot
   */
  getSnapshot(): MetricsSnapshot {
    const snapshot: MetricsSnapshot = {
      timestamp: new Date().toISOString(),
      counters: {},
      timings: {},
    };

    // Counters
    this.counters.forEach((value, key) => {
      snapshot.counters[key] = value;
    });

    // Timings
    this.timings.forEach((values, key) => {
      const count = values.length;
      const totalMs = values.reduce((sum, val) => sum + val, 0);
      const avgMs = count > 0 ? totalMs / count : 0;

      snapshot.timings[key] = {
        count,
        totalMs: Math.round(totalMs),
        avgMs: Math.round(avgMs * 100) / 100,
      };
    });

    return snapshot;
  }

  /**
   * Log metrics summary
   */
  logSummary(): void {
    const snapshot = this.getSnapshot();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 METRICS SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Timestamp: ${snapshot.timestamp}\n`);

    if (Object.keys(snapshot.counters).length > 0) {
      console.log('Counters:');
      Object.entries(snapshot.counters)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      console.log('');
    }

    if (Object.keys(snapshot.timings).length > 0) {
      console.log('Timings:');
      Object.entries(snapshot.timings)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([key, stats]) => {
          console.log(
            `  ${key}: ${stats.count} calls, avg ${stats.avgMs}ms, total ${stats.totalMs}ms`
          );
        });
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.counters.clear();
    this.timings.clear();
  }
}

// Singleton instance
export const metrics = new MetricsService();

/**
 * Helper to time async operations
 */
export async function timeAsync<T>(
  metricName: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    metrics.timing(metricName, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    metrics.timing(metricName, duration);
    throw error;
  }
}

/**
 * Helper to time sync operations
 */
export function timeSync<T>(metricName: string, fn: () => T): T {
  const start = Date.now();
  try {
    const result = fn();
    const duration = Date.now() - start;
    metrics.timing(metricName, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    metrics.timing(metricName, duration);
    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// METRIC DEFINITIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Counter: Startup Events
 */
export const MetricStartupSuccess = 'startup.success';
export const MetricStartupFailure = 'startup.failure';
export const MetricBootstrapValidationSuccess = 'startup.bootstrap.success';
export const MetricBootstrapValidationFailure = 'startup.bootstrap.failure';

/**
 * Counter: Twilio Webhooks
 */
export const MetricTwilioInboundSMS = 'twilio.inbound.sms';
export const MetricTwilioInboundVoice = 'twilio.inbound.voice';
export const MetricTwilioCallStatus = 'twilio.callstatus';
export const MetricTwilioWebhookError = 'twilio.webhook.error';

/**
 * Counter + Timing: AI Pipeline
 */
export const MetricAIPipelineSuccess = 'ai.pipeline.success';
export const MetricAIPipelineFailure = 'ai.pipeline.failure';
export const MetricAIPipelineDuration = 'ai.pipeline.duration';

/**
 * Counter: Health Checks
 */
export const MetricHealthCheckHealthy = 'health.check.healthy';
export const MetricHealthCheckUnhealthy = 'health.check.unhealthy';

/**
 * Timing: Database Operations
 */
export const MetricDBQuery = 'db.query.duration';

/**
 * Counter: Conversation Mode Tracking
 */
export const MetricConversationCreated = 'conversation.created';
export const MetricConversationInvariantViolationPipeline = 'conversation.invariant_violation.pipeline';
export const MetricConversationInvariantViolationHandler = 'conversation.invariant_violation.handler';

/**
 * Counter: Voice Call Routing Invariant Violations
 */
export const MetricVoiceCallOnboardingNumberViolation = 'voice.invariant_violation.onboarding_number';
export const MetricVoiceCallStatusOnboardingNumberViolation = 'voice.status.invariant_violation.onboarding_number';
export const MetricVoiceCallOperationalNumberNoClient = 'voice.status.error.operational_no_client';
export const MetricVoiceCallSystemNumber = 'voice.system_number';

/**
 * Counter: Twilio Number Pool Invariant Violations
 */
export const MetricTwilioNumberPoolOrphanedOperational = 'twilio_number_pool.invariant_violation.orphaned_operational';

/**
 * Counter: SYSTEM Number Fail-Safe Intake
 */
export const MetricVoiceCallSystemFailsafeIntake = 'voice.system_failsafe_intake';
