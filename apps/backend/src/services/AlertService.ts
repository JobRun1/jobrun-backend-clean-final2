/**
 * CRITICAL ALERTING SERVICE
 *
 * Production-grade alerting for revenue-impacting conditions.
 *
 * DESIGN PRINCIPLES:
 * - Signal over noise (only critical alerts)
 * - Idempotent (no spam)
 * - Non-blocking (never crashes main execution)
 * - SMS-first (most immediate for solo founder)
 * - Conservative (better to miss one alert than send 100)
 *
 * ALERT PHILOSOPHY:
 * - HIGH severity: Requires immediate action (within 1 hour)
 * - MEDIUM severity: Requires action within 4 hours
 * - LOW severity: Informational only (no alert)
 */

import { prisma } from "../db";
import twilio from "twilio";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type AlertSeverity = "HIGH" | "MEDIUM" | "LOW";
export type AlertChannel = "SMS" | "EMAIL" | "SLACK";

export interface AlertPayload {
  type: string; // STUCK_CLIENT, POOL_EMPTY, OPENAI_FAILURE, etc.
  severity: AlertSeverity;
  resourceId?: string; // clientId, poolId, etc.
  title: string; // Brief description
  message: string; // Detailed message with action items
  actionUrl?: string; // Link to admin interface (if available)
  metadata?: Record<string, any>; // Additional context
}

export interface AlertDeliveryResult {
  success: boolean;
  channel: AlertChannel;
  alertId?: string; // Database record ID
  error?: string;
  suppressed?: boolean; // True if alert was deduplicated
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Validate E.164 phone number format
 * Format: +[country code][number] (e.g., +447450326372)
 */
function validateE164(phone: string | null | undefined, label: string): void {
  if (!phone) {
    throw new Error(
      `[ALERT] FATAL: ${label} is not configured. Set environment variable.`
    );
  }

  const e164Regex = /^\+[1-9]\d{1,14}$/;
  if (!e164Regex.test(phone)) {
    throw new Error(
      `[ALERT] FATAL: ${label} is not in E.164 format. Got: "${phone}". Expected: +[country][number] (e.g., +447450326372)`
    );
  }
}

const ALERT_CONFIG = {
  // Deduplication window: Don't re-alert for same condition within this time
  SUPPRESSION_WINDOW_HOURS: 6,

  // Primary alert channel
  PRIMARY_CHANNEL: "SMS" as AlertChannel,

  // CRITICAL: Dedicated ops alerting numbers (NEVER use onboarding numbers)
  FOUNDER_ALERT_PHONE: process.env.FOUNDER_ALERT_PHONE || null,
  TWILIO_OPS_NUMBER: process.env.TWILIO_OPS_NUMBER || null,

  // Severity thresholds for alerting
  ALERT_ON_SEVERITIES: ["HIGH", "MEDIUM"] as AlertSeverity[],

  // Twilio configuration (shared with onboarding)
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
};

// STARTUP VALIDATION: Fail fast if ops alerting not configured correctly
try {
  validateE164(ALERT_CONFIG.FOUNDER_ALERT_PHONE, "FOUNDER_ALERT_PHONE");
  validateE164(ALERT_CONFIG.TWILIO_OPS_NUMBER, "TWILIO_OPS_NUMBER");

  if (!ALERT_CONFIG.TWILIO_ACCOUNT_SID || !ALERT_CONFIG.TWILIO_AUTH_TOKEN) {
    throw new Error(
      "[ALERT] FATAL: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not configured"
    );
  }

  console.log("✅ [ALERT] Ops alerting configured correctly:");
  console.log(`   From: ${ALERT_CONFIG.TWILIO_OPS_NUMBER}`);
  console.log(`   To: ${ALERT_CONFIG.FOUNDER_ALERT_PHONE}`);
} catch (error) {
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error("🚨 CRITICAL ALERTING SYSTEM CONFIGURATION ERROR");
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error(error instanceof Error ? error.message : String(error));
  console.error("");
  console.error("Required environment variables:");
  console.error("  FOUNDER_ALERT_PHONE=+447542769817  (founder's personal phone)");
  console.error("  TWILIO_OPS_NUMBER=+447450326372    (dedicated ops Twilio number)");
  console.error("  TWILIO_ACCOUNT_SID=ACxxx...");
  console.error("  TWILIO_AUTH_TOKEN=xxx...");
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  throw error; // Crash on startup if misconfigured
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SCHEMA GUARD (POST-INCIDENT LOCKDOWN)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// READ-ONLY validation that alert_logs schema matches Prisma client.
// Prevents schema drift that breaks deduplication.
// FAIL MODE: Crash on startup (fail-fast).
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function validateAlertLogsSchema(): Promise<void> {
  const requiredColumns = [
    "alert_type",
    "alert_key",
    "severity",
    "delivered_at",
    "acknowledged_at",
    "acknowledged_by",
    "resolution",
    "channel",
  ];

  const rows = await prisma.$queryRaw<
    { column_name: string }[]
  >`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'alert_logs'
  `;

  const existing = new Set(rows.map(r => r.column_name));
  const missing = requiredColumns.filter(c => !existing.has(c));

  if (missing.length > 0) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("🚨 FATAL: alert_logs schema mismatch");
    console.error("Missing columns:", missing.join(", "));
    console.error("Alerting cannot operate safely.");
    console.error("Startup aborted.");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    throw new Error("ALERT_LOGS schema validation failed");
  }

  console.log("✅ [ALERT_GUARD] alert_logs schema verified");
}

// Execute schema guard at module load time (blocks startup if fails)
validateAlertLogsSchema().catch((error) => {
  console.error("[FATAL] AlertService schema guard failed:", error);
  process.exit(1);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ALERT SERVICE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class AlertService {
  /**
   * Send critical alert (primary interface)
   *
   * This method:
   * 1. Checks if alert should be sent (severity threshold)
   * 2. Deduplicates based on alert key
   * 3. Delivers via configured channel
   * 4. Logs delivery attempt
   * 5. Never throws (non-blocking)
   */
  static async sendCriticalAlert(payload: AlertPayload): Promise<AlertDeliveryResult> {
    try {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🚨 NUCLEAR KILL SWITCH - ENVIRONMENT VARIABLE (HIGHEST PRIORITY)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // This is a PHYSICAL CIRCUIT BREAKER. No conditions. No exceptions.
      // Set ALERTS_DISABLED=true in environment to STOP ALL ALERTS immediately.
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      if (process.env.ALERTS_DISABLED === "true") {
        console.warn("🚨 [KILL_SWITCH] ALL ALERTS DISABLED VIA ALERTS_DISABLED=true");
        return {
          success: false,
          channel: ALERT_CONFIG.PRIMARY_CHANNEL,
          suppressed: true,
        };
      }
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // EMERGENCY GUARD: Phase 5 schema check (REMOVE AFTER MIGRATION)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // This guard prevents alert spam if Phase 5 migrations are not live.
      // FAIL-CLOSED: Suppress alerts if schema check fails or Phase 5 not deployed.
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const phase5SchemaLive = await this.checkPhase5SchemaExists();
      if (!phase5SchemaLive) {
        // Single log warning (won't spam logs)
        console.warn(
          "[ALERT_SUPPRESSED] Phase 5 schema not deployed — all ops alerts paused until migration applied. " +
          "Run: npx prisma migrate deploy"
        );
        return {
          success: false,
          channel: ALERT_CONFIG.PRIMARY_CHANNEL,
          suppressed: true,
        };
      }
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      // Step 1: Check if severity warrants alerting
      if (!ALERT_CONFIG.ALERT_ON_SEVERITIES.includes(payload.severity)) {
        console.log(`[ALERT] Skipping alert (severity=${payload.severity} below threshold)`);
        return {
          success: false,
          channel: ALERT_CONFIG.PRIMARY_CHANNEL,
          suppressed: true,
        };
      }

      // Step 2: Generate alert key for deduplication
      const alertKey = this.generateAlertKey(payload);

      // Step 3: Check if alert already sent recently (deduplication)
      const recentAlert = await this.findRecentAlert(payload.type, alertKey);

      if (recentAlert) {
        const hoursSinceLastAlert = this.getHoursSince(recentAlert.deliveredAt);

        if (hoursSinceLastAlert < ALERT_CONFIG.SUPPRESSION_WINDOW_HOURS) {
          console.log(
            `[ALERT] Suppressing duplicate alert (type=${payload.type}, key=${alertKey}, lastAlert=${hoursSinceLastAlert}h ago)`
          );
          return {
            success: false,
            channel: ALERT_CONFIG.PRIMARY_CHANNEL,
            suppressed: true,
          };
        }

        console.log(
          `[ALERT] Re-alerting persistent condition (type=${payload.type}, key=${alertKey}, lastAlert=${hoursSinceLastAlert}h ago)`
        );
      }

      // Step 4: Deliver alert via configured channel
      const deliveryResult = await this.deliverAlert(payload);

      // Step 5: Log alert delivery (success or failure)
      const alertLog = await prisma.alertLog.create({
        data: {
          alertType: payload.type,
          alertKey,
          severity: payload.severity,
          resourceId: payload.resourceId || null,
          deliveredAt: new Date(),
          channel: ALERT_CONFIG.PRIMARY_CHANNEL,
          ...(payload.metadata && { metadata: payload.metadata }),
        },
      });

      console.log(
        `[ALERT] Alert delivered (id=${alertLog.id}, type=${payload.type}, severity=${payload.severity}, channel=${ALERT_CONFIG.PRIMARY_CHANNEL})`
      );

      return {
        success: deliveryResult.success,
        channel: ALERT_CONFIG.PRIMARY_CHANNEL,
        alertId: alertLog.id,
        error: deliveryResult.error,
      };
    } catch (error) {
      // CRITICAL: Never throw - log error and return failure
      console.error("[ALERT] Failed to send alert (non-blocking error):", error);
      return {
        success: false,
        channel: ALERT_CONFIG.PRIMARY_CHANNEL,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Deliver alert via SMS (primary channel)
   *
   * CRITICAL: Always sends FROM dedicated ops number TO founder's personal phone
   * NEVER uses onboarding or client numbers
   */
  private static async deliverAlert(
    payload: AlertPayload
  ): Promise<{ success: boolean; error?: string }> {
    // Note: Validation happens at startup, so these should never be null
    // But we double-check for safety
    if (!ALERT_CONFIG.FOUNDER_ALERT_PHONE || !ALERT_CONFIG.TWILIO_OPS_NUMBER) {
      console.error("[ALERT] CRITICAL: Ops alerting numbers not configured (should have failed at startup)");
      this.logAlertToConsole(payload);
      return { success: false, error: "Ops alerting not configured" };
    }

    try {
      const client = twilio(ALERT_CONFIG.TWILIO_ACCOUNT_SID, ALERT_CONFIG.TWILIO_AUTH_TOKEN);

      // Format SMS message (160 char limit consideration)
      const smsBody = this.formatSmsMessage(payload);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🚨 FORENSIC LOGGING - Identify alert spam source
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      console.error("🚨🚨🚨 TWILIO SEND EXECUTED FROM:", __filename);
      console.error("🚨 STACK TRACE:", new Error().stack);
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      // Send SMS - ALWAYS from ops number to founder's phone
      const message = await client.messages.create({
        to: ALERT_CONFIG.FOUNDER_ALERT_PHONE,   // Founder's personal phone
        from: ALERT_CONFIG.TWILIO_OPS_NUMBER,   // Dedicated ops Twilio number
        body: smsBody,
      });

      console.log(`[ALERT] SMS sent successfully (sid=${message.sid})`);
      console.log(`[ALERT]   From: ${ALERT_CONFIG.TWILIO_OPS_NUMBER}`);
      console.log(`[ALERT]   To: ${ALERT_CONFIG.FOUNDER_ALERT_PHONE}`);
      return { success: true };
    } catch (error) {
      console.error("[ALERT] SMS delivery failed:", error);

      // Fallback: Log to console so alert is not lost
      this.logAlertToConsole(payload);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Format alert as SMS (160 char optimized)
   */
  private static formatSmsMessage(payload: AlertPayload): string {
    const severityEmoji = {
      HIGH: "🚨",
      MEDIUM: "⚠️",
      LOW: "ℹ️",
    };

    // Format: 🚨 HIGH: Title\nMessage\nAction URL
    let message = `${severityEmoji[payload.severity]} ${payload.severity}: ${payload.title}\n\n${payload.message}`;

    if (payload.actionUrl) {
      message += `\n\n${payload.actionUrl}`;
    }

    // Truncate if too long (safety)
    if (message.length > 1600) {
      message = message.substring(0, 1590) + "...[truncated]";
    }

    return message;
  }

  /**
   * Fallback: Log alert to console (in case SMS fails)
   */
  private static logAlertToConsole(payload: AlertPayload): void {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🚨 CRITICAL ALERT - ${payload.severity}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Type: ${payload.type}`);
    console.log(`Title: ${payload.title}`);
    console.log(`Message: ${payload.message}`);
    if (payload.resourceId) console.log(`Resource ID: ${payload.resourceId}`);
    if (payload.actionUrl) console.log(`Action URL: ${payload.actionUrl}`);
    if (payload.metadata) console.log(`Metadata:`, payload.metadata);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }

  /**
   * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   * EMERGENCY GUARD: Check if Phase 5 schema is deployed
   * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   *
   * REMOVE THIS METHOD AFTER PHASE 5 MIGRATION IS LIVE IN PRODUCTION
   *
   * Purpose: Prevent alert spam before Phase 5 migrations are applied
   * Behavior: Check if alert_logs.acknowledged_at column exists
   * Fail mode: CLOSED (returns false if check fails or column missing)
   *
   * @returns true if Phase 5 schema is live, false otherwise
   */
  private static async checkPhase5SchemaExists(): Promise<boolean> {
    try {
      // Lightweight schema check: Does alert_logs have acknowledged_at?
      const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'alert_logs'
            AND column_name = 'acknowledged_at'
        ) as exists
      `;

      const schemaExists = result[0]?.exists === true;

      if (!schemaExists) {
        // Only log once per boot (subsequent calls will still return false but won't log)
        // This prevents log spam
        return false;
      }

      return true;
    } catch (error) {
      // FAIL CLOSED: If schema check fails, suppress alerts
      // This prevents alerts from being sent if DB is unreachable
      console.error("[ALERT] Phase 5 schema check failed (suppressing alerts):", error);
      return false;
    }
  }

  /**
   * Generate alert key for deduplication
   *
   * Format: type:resourceId or type:checksum
   */
  private static generateAlertKey(payload: AlertPayload): string {
    if (payload.resourceId) {
      return `${payload.type}:${payload.resourceId}`;
    }

    // For system-wide alerts (no resourceId), use type only
    return payload.type;
  }

  /**
   * Find recent alert for deduplication check (PHASE 5: Acknowledgment-aware)
   *
   * BEHAVIOR:
   * - If most recent alert is unacknowledged → suppress (return alert)
   * - If most recent alert is acknowledged → check 24h cooldown
   * - If no recent alert → allow (return null)
   *
   * This implements append-only alert history with acknowledgment logic.
   */
  private static async findRecentAlert(
    alertType: string,
    alertKey: string
  ): Promise<{ deliveredAt: Date; acknowledgedAt: Date | null } | null> {
    // Find most recent alert for this type+key (append-only, no unique constraint)
    const alert = await prisma.alertLog.findFirst({
      where: {
        alertType,
        alertKey,
      },
      orderBy: {
        deliveredAt: 'desc',
      },
      select: {
        deliveredAt: true,
        acknowledgedAt: true,
      },
    });

    if (!alert) {
      return null; // No previous alert, proceed
    }

    // PHASE 5 LOGIC: Check acknowledgment status
    if (!alert.acknowledgedAt) {
      // Alert exists but not acknowledged → suppress
      return alert;
    }

    // Alert acknowledged → check 24h cooldown
    const hoursSinceAck = this.getHoursSince(alert.acknowledgedAt);
    const ACKNOWLEDGMENT_COOLDOWN_HOURS = 24;

    if (hoursSinceAck < ACKNOWLEDGMENT_COOLDOWN_HOURS) {
      // Within cooldown period → suppress
      console.log(
        `[ALERT] Alert acknowledged ${hoursSinceAck.toFixed(1)}h ago (within 24h cooldown)`
      );
      return alert;
    }

    // Cooldown expired → allow re-alert
    console.log(
      `[ALERT] Alert acknowledged ${hoursSinceAck.toFixed(1)}h ago (cooldown expired)`
    );
    return null;
  }

  /**
   * Calculate hours since timestamp
   */
  private static getHoursSince(timestamp: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    return diffMs / 1000 / 60 / 60;
  }

  /**
   * Get alert statistics (for debugging/monitoring)
   */
  static async getAlertStats(hours: number = 24): Promise<{
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    recentAlerts: Array<{
      type: string;
      severity: string;
      deliveredAt: Date;
      resourceId: string | null;
    }>;
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const alerts = await prisma.alertLog.findMany({
      where: {
        deliveredAt: {
          gte: since,
        },
      },
      select: {
        alertType: true,
        severity: true,
        deliveredAt: true,
        resourceId: true,
      },
      orderBy: {
        deliveredAt: "desc",
      },
    });

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const alert of alerts) {
      byType[alert.alertType] = (byType[alert.alertType] || 0) + 1;
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
    }

    return {
      total: alerts.length,
      byType,
      bySeverity,
      recentAlerts: alerts.map((a) => ({
        type: a.alertType,
        severity: a.severity,
        deliveredAt: a.deliveredAt,
        resourceId: a.resourceId,
      })),
    };
  }

  /**
   * Silence all alerts temporarily (emergency use)
   *
   * Returns a function to restore normal alerting.
   */
  static silenceAlerts(): () => void {
    const originalConfig = { ...ALERT_CONFIG };

    // Override alert severities to empty array (no alerts)
    ALERT_CONFIG.ALERT_ON_SEVERITIES = [];

    console.warn("[ALERT] ⚠️  ALL ALERTS SILENCED - restore with returned function");

    // Return restore function
    return () => {
      ALERT_CONFIG.ALERT_ON_SEVERITIES = originalConfig.ALERT_ON_SEVERITIES;
      console.log("[ALERT] ✅ Alerts restored to normal operation");
    };
  }

  /**
   * List unacknowledged alerts (PHASE 5: Admin Panel)
   *
   * Returns all alerts that need operator attention.
   *
   * @param limit - Maximum number of alerts to return
   * @returns Array of unacknowledged alerts
   */
  static async listUnacknowledgedAlerts(limit: number = 50): Promise<Array<{
    id: string;
    alertType: string;
    alertKey: string;
    severity: string;
    resourceId: string | null;
    deliveredAt: Date;
    message: string | null;
  }>> {
    const alerts = await prisma.alertLog.findMany({
      where: {
        acknowledgedAt: null,
      },
      orderBy: {
        deliveredAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        alertType: true,
        alertKey: true,
        severity: true,
        resourceId: true,
        deliveredAt: true,
        metadata: true,
      },
    });

    return alerts.map((alert) => ({
      id: alert.id,
      alertType: alert.alertType,
      alertKey: alert.alertKey,
      severity: alert.severity,
      resourceId: alert.resourceId,
      deliveredAt: alert.deliveredAt,
      message: (alert.metadata as any)?.message || null,
    }));
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ALERT TEMPLATES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Pre-built alert templates for common conditions
 */
export const AlertTemplates = {
  /**
   * Test alert for validating ops alerting configuration
   *
   * Usage:
   *   await AlertService.sendCriticalAlert(AlertTemplates.testAlert());
   *
   * Expected:
   *   - SMS sent FROM +447450326372 (ops number)
   *   - SMS delivered TO +447542769817 (founder's phone)
   *   - Message: "JobRun Ops alerting is live."
   */
  testAlert: (): AlertPayload => ({
    type: "TEST_ALERT",
    severity: "HIGH",
    title: "Test Alert",
    message: "JobRun Ops alerting is live.",
    metadata: {
      timestamp: new Date().toISOString(),
      purpose: "Configuration validation",
    },
  }),

  /**
   * Stuck client alert (HIGH severity, terminal state)
   */
  stuckClient: (client: {
    clientId: string;
    businessName: string;
    phoneNumber: string | null;
    currentState: string;
    timeInState: string;
  }): AlertPayload => ({
    type: "STUCK_CLIENT",
    severity: "HIGH",
    resourceId: client.clientId,
    title: `Client stuck: ${client.businessName}`,
    message: `${client.businessName} stuck at ${client.currentState} for ${client.timeInState}. Call ${client.phoneNumber || "unknown"} to help complete onboarding.`,
    actionUrl: `http://localhost:3001/api/admin/stuck-clients`,
    metadata: {
      clientId: client.clientId,
      businessName: client.businessName,
      phoneNumber: client.phoneNumber,
      currentState: client.currentState,
      timeInState: client.timeInState,
    },
  }),

  /**
   * Payment block alert (MEDIUM → HIGH escalation)
   */
  paymentBlock: (client: {
    clientId: string;
    businessName: string;
    phoneNumber: string | null;
    timeInState: string;
  }): AlertPayload => ({
    type: "PAYMENT_BLOCK",
    severity: "MEDIUM",
    resourceId: client.clientId,
    title: `Payment block: ${client.businessName}`,
    message: `${client.businessName} stuck at payment gate for ${client.timeInState}. Verify payment in Stripe, then activate manually if confirmed.`,
    actionUrl: `http://localhost:3001/api/admin/clients`,
    metadata: {
      clientId: client.clientId,
      businessName: client.businessName,
      phoneNumber: client.phoneNumber,
      timeInState: client.timeInState,
    },
  }),

  /**
   * Twilio number pool empty alert (HIGH severity)
   */
  poolEmpty: (availableCount: number, assignedCount: number): AlertPayload => ({
    type: "POOL_EMPTY",
    severity: "HIGH",
    title: "Twilio pool empty",
    message: `No available Twilio numbers. ${assignedCount} assigned, 0 available. Add numbers immediately to prevent onboarding failures.`,
    metadata: {
      availableCount,
      assignedCount,
      timestamp: new Date().toISOString(),
    },
  }),

  /**
   * OpenAI extraction failure alert (HIGH severity)
   */
  openaiFailure: (failureCount: number, timeWindow: string): AlertPayload => ({
    type: "OPENAI_FAILURE",
    severity: "HIGH",
    title: "OpenAI extraction failing",
    message: `OpenAI extraction failed ${failureCount} times in ${timeWindow}. Check API key, quota, and service status. All onboarding may be blocked.`,
    metadata: {
      failureCount,
      timeWindow,
      timestamp: new Date().toISOString(),
    },
  }),

  /**
   * Runtime invariant violation alert (HIGH severity)
   */
  invariantViolation: (violations: Array<{ invariant: string; severity: string }>): AlertPayload => ({
    type: "INVARIANT_VIOLATION",
    severity: "HIGH",
    title: "Bootstrap invariant violated",
    message: `Critical system invariant violated: ${violations.map((v) => v.invariant).join(", ")}. System may be unhealthy.`,
    metadata: {
      violations,
      timestamp: new Date().toISOString(),
    },
  }),

  /**
   * Trial expired alert (MEDIUM severity)
   */
  trialExpired: (client: {
    clientId: string;
    businessName: string;
    phoneNumber: string | null;
    daysOverdue: number;
  }): AlertPayload => ({
    type: "TRIAL_EXPIRED",
    severity: "MEDIUM",
    resourceId: client.clientId,
    title: `Trial expired: ${client.businessName}`,
    message: `${client.businessName} (${client.phoneNumber || "unknown"}) trial expired ${client.daysOverdue} days ago. Outbound blocked. Client needs payment to continue.`,
    metadata: {
      clientId: client.clientId,
      businessName: client.businessName,
      phoneNumber: client.phoneNumber,
      daysOverdue: client.daysOverdue,
      timestamp: new Date().toISOString(),
    },
  }),
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ALERT SYSTEM STATUS (PRODUCTION VISIBILITY)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Get alert system status for health checks and monitoring
 * Exposes whether alerts are globally disabled or degraded
 */
export function getAlertSystemStatus() {
  const isDisabled = process.env.ALERTS_DISABLED === "true";
  const founderPhone = process.env.FOUNDER_PHONE_NUMBER;

  return {
    enabled: !isDisabled,
    reason: isDisabled ? "ALERTS_DISABLED env var set to true" : "normal",
    founderPhoneConfigured: !!founderPhone,
    primaryChannel: ALERT_CONFIG.PRIMARY_CHANNEL,
  };
}
