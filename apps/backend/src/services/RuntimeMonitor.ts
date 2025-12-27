import { checkRuntimeInvariants, formatViolationsForLog } from './HealthCheck';
import { StuckClientDetector } from './StuckClientDetector';
import { AlertService, AlertTemplates } from './AlertService';

/**
 * Runtime Invariant Monitor
 *
 * Production-only background monitor that validates bootstrap invariants
 * every 5 minutes. Logs violations but does NOT crash the app.
 *
 * Purpose: Detect runtime drift within 5 minutes of occurrence.
 */

const MONITOR_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let monitorInterval: NodeJS.Timeout | null = null;

/**
 * Run a single invariant check and log results
 */
async function runInvariantCheck(): Promise<void> {
  // Check 1: Bootstrap invariants
  const result = await checkRuntimeInvariants();

  if (!result.healthy) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('🚨 RUNTIME INVARIANT MONITOR ALERT');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`Timestamp: ${result.timestamp}`);
    console.error('');
    console.error(formatViolationsForLog(result.violations));
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Action Required: Runtime invariants are violated.');
    console.error('This deployment is UNHEALTHY and may fail health checks.');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // CRITICAL ALERT: Bootstrap invariants violated
    await AlertService.sendCriticalAlert(
      AlertTemplates.invariantViolation(result.violations)
    );

    // Alert placeholder - can be replaced with PagerDuty/Slack/etc
    emitAlert(result.violations);
  } else {
    console.log(`✅ Runtime invariant check passed at ${result.timestamp}`);
  }

  // Check 2: Stuck client detection (production hardening)
  try {
    await StuckClientDetector.detectAndLog();
  } catch (error) {
    console.error('❌ Stuck client detection failed:', error);
  }
}

/**
 * Alert placeholder
 * In production, this would integrate with external alerting (PagerDuty, Slack, etc)
 */
function emitAlert(violations: any[]): void {
  console.error('🔔 ALERT: Runtime invariant violations detected');
  console.error(`   Violation count: ${violations.length}`);
  console.error('   Integrate external alerting here (PagerDuty, Slack, etc)');
}

/**
 * Start the runtime monitor (production only)
 */
export function startRuntimeMonitor(): void {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    console.log('⏸️  Runtime monitor disabled (not production)');
    return;
  }

  console.log('🔍 Starting runtime invariant monitor...');
  console.log(`   Check interval: ${MONITOR_INTERVAL_MS / 1000 / 60} minutes`);

  // Run first check immediately
  runInvariantCheck().catch((error) => {
    console.error('Runtime monitor check failed:', error);
  });

  // Schedule recurring checks
  monitorInterval = setInterval(() => {
    runInvariantCheck().catch((error) => {
      console.error('Runtime monitor check failed:', error);
    });
  }, MONITOR_INTERVAL_MS);

  console.log('✅ Runtime invariant monitor started');
}

/**
 * Stop the runtime monitor (for graceful shutdown)
 */
export function stopRuntimeMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log('⏸️  Runtime monitor stopped');
  }
}
