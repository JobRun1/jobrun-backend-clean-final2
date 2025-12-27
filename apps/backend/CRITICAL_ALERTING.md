# Critical Alerting System

**Production-Grade Proactive Notification Layer**

## Purpose

Ensures founder is immediately notified of revenue-impacting conditions that require manual intervention.

**Philosophy:** Detection without alerting = silent failure. This system bridges that gap.

---

## Alert Channel

**Primary:** SMS via Twilio

**Why SMS:**
- Most immediate (founder always has phone)
- No dependency on email/Slack being open
- Critical alerts warrant interruption
- Already have Twilio infrastructure
- 30-second setup

**Fallback:** Console logs (if SMS delivery fails)

---

## Alert Triggers

### 1. STUCK_CLIENT (HIGH Severity + Terminal)

**Condition:**
- Client detected as stuck
- Severity = HIGH
- isTerminal = true (will never auto-progress)
- Typically: S9_TEST_CALL >24 hours

**Example Alert:**
```
🚨 HIGH: Client stuck: ABC Plumbing

ABC Plumbing stuck at S9_TEST_CALL for 1d 2h. Call 447700900123 to help complete onboarding.

http://localhost:3001/api/admin/stuck-clients
```

**Action Required:**
- Call client at provided phone number
- Guide through test call completion
- OR manually advance to COMPLETE if verified

**Suppression:** 6 hours (re-alerts if still stuck)

---

### 2. PAYMENT_BLOCK (MEDIUM Severity)

**Condition:**
- Client stuck at S5_CONFIRM_LIVE
- paymentActive = false
- Time in state >2 hours

**Example Alert:**
```
⚠️ MEDIUM: Payment block: XYZ Electrician

XYZ Electrician stuck at payment gate for 3h. Verify payment in Stripe, then activate manually if confirmed.

http://localhost:3001/api/admin/clients
```

**Action Required:**
1. Check Stripe dashboard for payment
2. If payment confirmed, activate:
   ```sql
   UPDATE clients SET payment_active = true WHERE id = 'xxx';
   ```
3. Tell client to reply "READY" to continue

**Suppression:** 6 hours

---

### 3. POOL_EMPTY (HIGH Severity)

**Condition:**
- Zero AVAILABLE Twilio numbers in pool
- Triggered on first allocation attempt

**Example Alert:**
```
🚨 HIGH: Twilio pool empty

No available Twilio numbers. 15 assigned, 0 available. Add numbers immediately to prevent onboarding failures.
```

**Action Required:**
```sql
INSERT INTO twilio_number_pool (phone_e164, status)
VALUES ('+447700900999', 'AVAILABLE');
```

**Suppression:** Until pool refilled (new POOL_EMPTY alert type created)

---

### 4. OPENAI_FAILURE (HIGH Severity)

**Condition:**
- 5 consecutive OpenAI extraction failures
- Within 15-minute window

**Example Alert:**
```
🚨 HIGH: OpenAI extraction failing

OpenAI extraction failed 5 times in 15 minutes. Check API key, quota, and service status. All onboarding may be blocked.
```

**Action Required:**
1. Check OpenAI dashboard for:
   - API key validity
   - Rate limits / quota
   - Service status
2. Check OPENAI_API_KEY environment variable
3. Monitor logs for specific error messages

**Reset:** Any successful extraction resets counter
**Suppression:** After first alert until counter resets

---

### 5. INVARIANT_VIOLATION (HIGH Severity)

**Condition:**
- Bootstrap invariant check fails
- Detected by RuntimeMonitor every 5 minutes

**Example Alert:**
```
🚨 HIGH: Bootstrap invariant violated

Critical system invariant violated: DEFAULT_CLIENT_EXISTS, BOOKING_URL_VALID. System may be unhealthy.
```

**Action Required:**
1. Check environment variables (DEFAULT_CLIENT_ID)
2. Verify database integrity
3. Check /api/health endpoint for details

**Suppression:** 6 hours (re-alerts if not fixed)

---

## How It Works

### Deduplication (Idempotency)

**Problem:** Without deduplication, same alert sends every 5 minutes → 288/day.

**Solution:** `alert_logs` table tracks delivered alerts by unique key:
```
alertType:resourceId
```

**Suppression Window:** 6 hours

**Logic:**
```
1. Generate alert key (e.g., "STUCK_CLIENT:clientId123")
2. Check alert_logs for recent delivery
3. If delivered <6h ago: suppress (no SMS sent)
4. If >6h ago OR never sent: deliver alert
5. Log delivery to alert_logs table
```

**Result:** Persistent conditions re-alert every 6 hours (not every 5 minutes).

---

### Non-Blocking Execution

**CRITICAL:** Alert delivery NEVER crashes main execution.

**Implementation:**
```typescript
try {
  await AlertService.sendCriticalAlert(payload);
} catch (error) {
  // Log error but continue
  console.error('[ALERT] Failed (non-blocking):', error);
}
```

**Fallback Chain:**
1. Try SMS delivery
2. If fails → Log to console
3. Never throw exception

**Guarantees:**
- Twilio API errors won't crash server
- Missing ADMIN_PHONE won't block onboarding
- Network failures are logged, not fatal

---

## Configuration

### Required Environment Variables

```bash
# Alert delivery (REQUIRED)
ADMIN_PHONE=+447700900123  # UK format with +44 prefix

# Twilio (already configured for SMS)
TWILIO_ACCOUNT_SID=ACxxx...
TWILIO_AUTH_TOKEN=xxx...
TWILIO_NUMBER=+447476955179
```

### Optional Configuration

Edit `src/services/AlertService.ts`:

```typescript
const ALERT_CONFIG = {
  // Change suppression window (default: 6 hours)
  SUPPRESSION_WINDOW_HOURS: 6,

  // Change alert severities (default: HIGH + MEDIUM)
  ALERT_ON_SEVERITIES: ["HIGH", "MEDIUM"],
};
```

---

## Testing Alerts

### Local Testing (Development)

**1. Test SMS Delivery:**
```typescript
import { AlertService, AlertTemplates } from './services/AlertService';

await AlertService.sendCriticalAlert({
  type: "TEST_ALERT",
  severity: "HIGH",
  title: "Test Alert",
  message: "This is a test alert from JobRun development.",
});
```

**Expected:** SMS arrives at ADMIN_PHONE within 10 seconds.

---

**2. Test Stuck Client Alert:**
```sql
-- Create a stuck client
INSERT INTO clients (id, business_name, region, phone_number, payment_active)
VALUES ('test-stuck-1', 'Test Business', 'UK', '447700900999', true);

INSERT INTO onboarding_states (client_id, current_state, updated_at)
VALUES ('test-stuck-1', 'S9_TEST_CALL', NOW() - INTERVAL '30 hours');
```

Wait 5 minutes for RuntimeMonitor, or trigger manually:
```typescript
import { StuckClientDetector } from './services/StuckClientDetector';
await StuckClientDetector.detectAndLog();
```

**Expected:** SMS alert for stuck client.

**Cleanup:**
```sql
DELETE FROM onboarding_states WHERE client_id = 'test-stuck-1';
DELETE FROM clients WHERE id = 'test-stuck-1';
```

---

**3. Test Pool Empty Alert:**
```sql
-- Mark all numbers as assigned
UPDATE twilio_number_pool SET status = 'ASSIGNED';
```

Then trigger allocation:
```typescript
import { allocateTwilioNumber } from './services/TwilioNumberPoolService';
await allocateTwilioNumber('test-client-id');
```

**Expected:** SMS alert for empty pool.

**Cleanup:**
```sql
UPDATE twilio_number_pool SET status = 'AVAILABLE', client_id = NULL, assigned_at = NULL LIMIT 5;
```

---

**4. Test OpenAI Failure Alert:**
```typescript
import { OpenAIFailureTracker } from './services/OpenAIFailureTracker';

// Simulate 5 failures
for (let i = 0; i < 5; i++) {
  await OpenAIFailureTracker.recordFailure('Test failure');
}
```

**Expected:** SMS alert after 5th failure.

**Cleanup:**
```typescript
OpenAIFailureTracker.reset();
```

---

### Production Verification

**Check alert delivery:**
```bash
curl http://localhost:3001/api/admin/alert-stats
```

**Expected Response:**
```json
{
  "total": 3,
  "byType": {
    "STUCK_CLIENT": 2,
    "POOL_EMPTY": 1
  },
  "bySeverity": {
    "HIGH": 3
  },
  "recentAlerts": [...]
}
```

---

## Temporarily Silencing Alerts

### Emergency Silence (Use Sparingly)

**When to use:**
- During planned maintenance
- When investigating known issue
- During testing in production

**How to silence:**
```typescript
import { AlertService } from './services/AlertService';

// Silence all alerts
const restore = AlertService.silenceAlerts();

// Do maintenance work...

// Restore normal alerting
restore();
```

**Warning:** Logs clearly indicate silencing is active.

**Auto-restore:** No - must call `restore()` manually (intentional).

---

### Per-Client Silence (Not Implemented)

Currently no way to silence alerts for specific client.

**Workaround:** Mark client's onboarding as COMPLETE:
```sql
UPDATE onboarding_states
SET current_state = 'COMPLETE', completed_at = NOW()
WHERE client_id = 'xxx';
```

---

## Alert Statistics & Monitoring

### View Recent Alerts

```typescript
import { AlertService } from './services/AlertService';

const stats = await AlertService.getAlertStats(24); // Last 24 hours

console.log(stats);
```

### Query Alert Logs (SQL)

```sql
-- Recent alerts
SELECT * FROM alert_logs
ORDER BY delivered_at DESC
LIMIT 20;

-- Alerts by type (last 7 days)
SELECT alert_type, COUNT(*) as count
FROM alert_logs
WHERE delivered_at > NOW() - INTERVAL '7 days'
GROUP BY alert_type
ORDER BY count DESC;

-- Alert frequency (per hour)
SELECT
  DATE_TRUNC('hour', delivered_at) as hour,
  COUNT(*) as alert_count
FROM alert_logs
WHERE delivered_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

---

## Integration Points

### 1. StuckClientDetector
**File:** `src/services/StuckClientDetector.ts`

**Integration:**
```typescript
// Alert for HIGH severity + terminal
if (client.severity === "HIGH" && client.isTerminal) {
  await AlertService.sendCriticalAlert(
    AlertTemplates.stuckClient({...})
  );
}

// Alert for payment blocks
if (client.currentState === "S5_CONFIRM_LIVE" && !client.paymentActive) {
  await AlertService.sendCriticalAlert(
    AlertTemplates.paymentBlock({...})
  );
}
```

---

### 2. TwilioNumberPoolService
**File:** `src/services/TwilioNumberPoolService.ts`

**Integration:**
```typescript
if (availableNumbers.length === 0) {
  const stats = await getPoolStats();
  await AlertService.sendCriticalAlert(
    AlertTemplates.poolEmpty(0, stats.byStatus?.ASSIGNED || 0)
  );
  return null;
}
```

---

### 3. OnboardingService (OpenAI Tracking)
**File:** `src/services/OnboardingService.ts`

**Integration:**
```typescript
// On success
OpenAIFailureTracker.recordSuccess();

// On failure
OpenAIFailureTracker.recordFailure(errorMessage);
// Alert sent automatically after 5 failures in 15 min
```

---

### 4. RuntimeMonitor
**File:** `src/services/RuntimeMonitor.ts`

**Integration:**
```typescript
if (!result.healthy) {
  await AlertService.sendCriticalAlert(
    AlertTemplates.invariantViolation(result.violations)
  );
}
```

---

## Example Alert Payloads

### Stuck Client Alert (SMS)
```
🚨 HIGH: Client stuck: ABC Plumbing

ABC Plumbing stuck at S9_TEST_CALL for 1d 2h. Call 447700900123 to help complete onboarding.

http://localhost:3001/api/admin/stuck-clients
```

### Payment Block Alert (SMS)
```
⚠️ MEDIUM: Payment block: XYZ Electrician

XYZ Electrician stuck at payment gate for 3h. Verify payment in Stripe, then activate manually if confirmed.

http://localhost:3001/api/admin/clients
```

### Pool Empty Alert (SMS)
```
🚨 HIGH: Twilio pool empty

No available Twilio numbers. 15 assigned, 0 available. Add numbers immediately to prevent onboarding failures.
```

### OpenAI Failure Alert (SMS)
```
🚨 HIGH: OpenAI extraction failing

OpenAI extraction failed 5 times in 15 minutes. Check API key, quota, and service status. All onboarding may be blocked.
```

### Invariant Violation Alert (SMS)
```
🚨 HIGH: Bootstrap invariant violated

Critical system invariant violated: DEFAULT_CLIENT_EXISTS, BOOKING_URL_VALID. System may be unhealthy.
```

---

## Known Limitations

### 1. SMS-Only Channel
**Limitation:** Only SMS supported (no email, Slack, PagerDuty)

**Mitigation:** SMS is most immediate for solo founder

**Future:** Add email/Slack as secondary channels

---

### 2. No Alert Escalation
**Limitation:** Alerts don't escalate if ignored

**Example:** HIGH alert at 10am, still stuck at 4pm → same severity

**Mitigation:** 6-hour re-alerts ensure persistent conditions visible

**Future:** Implement escalation (MEDIUM →  HIGH after 12h)

---

### 3. No Alert Aggregation
**Limitation:** 5 stuck clients = 5 separate SMS

**Mitigation:** Alerts suppressed for 6h (max 4 SMS/day per client)

**Future:** Batch alerts (e.g., "3 clients stuck")

---

### 4. No Custom Suppression
**Limitation:** Can't set "don't alert for this client for 24h"

**Workaround:** Manually complete onboarding or silence all alerts

**Future:** Per-client alert preferences

---

### 5. SMS Delivery Not Guaranteed
**Limitation:** Twilio API can fail (network, quota, invalid number)

**Mitigation:** Fallback to console logs (won't lose alert)

**Future:** Retry logic + delivery confirmation

---

## Troubleshooting

### "No SMS received"

**Check:**
1. ADMIN_PHONE configured correctly
   ```bash
   echo $ADMIN_PHONE
   ```
2. Twilio credentials valid
   ```bash
   echo $TWILIO_ACCOUNT_SID
   echo $TWILIO_AUTH_TOKEN
   ```
3. Alert severity threshold
   ```typescript
   // Only HIGH and MEDIUM trigger alerts
   ALERT_ON_SEVERITIES: ["HIGH", "MEDIUM"]
   ```
4. Deduplication suppression
   ```sql
   SELECT * FROM alert_logs WHERE alert_type = 'STUCK_CLIENT' ORDER BY delivered_at DESC LIMIT 5;
   ```
5. Console logs for fallback
   ```bash
   grep "CRITICAL ALERT" logs/*
   ```

---

### "Too many alerts"

**Fix 1:** Increase suppression window
```typescript
SUPPRESSION_WINDOW_HOURS: 12, // Was 6
```

**Fix 2:** Raise severity threshold
```typescript
ALERT_ON_SEVERITIES: ["HIGH"], // Was ["HIGH", "MEDIUM"]
```

**Fix 3:** Temporarily silence
```typescript
const restore = AlertService.silenceAlerts();
```

---

### "Alert log table full"

**Check size:**
```sql
SELECT COUNT(*) FROM alert_logs;
```

**Clean up old alerts:**
```sql
-- Delete alerts older than 30 days
DELETE FROM alert_logs WHERE delivered_at < NOW() - INTERVAL '30 days';
```

**Automatic cleanup:** Not implemented (future enhancement)

---

## Production Checklist

- [ ] `ADMIN_PHONE` environment variable set
- [ ] Phone number in E.164 format (+447...)
- [ ] Twilio credentials configured
- [ ] Test alert sent successfully
- [ ] Alert logs table created (migration applied)
- [ ] RuntimeMonitor running in production
- [ ] Founder phone can receive SMS
- [ ] Founder knows how to silence alerts if needed

---

## Quick Reference

**Send test alert:**
```typescript
await AlertService.sendCriticalAlert({
  type: "TEST",
  severity: "HIGH",
  title: "Test",
  message: "Testing alerting system",
});
```

**Check recent alerts:**
```sql
SELECT * FROM alert_logs ORDER BY delivered_at DESC LIMIT 10;
```

**Silence all alerts:**
```typescript
const restore = AlertService.silenceAlerts();
// ... do work ...
restore();
```

**View alert stats:**
```typescript
const stats = await AlertService.getAlertStats(24);
```

---

**Last Updated:** 2025-12-21
**Version:** 1.0.0
**Status:** Production-Ready
