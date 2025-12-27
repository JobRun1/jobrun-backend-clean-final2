# Critical Alerting - Setup Guide

## Quick Start (4 Steps)

```bash
# 1. Set admin phone number
export ADMIN_PHONE="+447700900123"  # Your UK mobile (with +44)

# 2. Apply database migration
npx prisma migrate dev --name add_alert_log

# 3. Generate Prisma client
npx prisma generate

# 4. Restart server
npm run dev
```

**Verification:** Send test alert:
```typescript
import { AlertService } from './services/AlertService';

await AlertService.sendCriticalAlert({
  type: "TEST_ALERT",
  severity: "HIGH",
  title: "Setup Test",
  message: "Critical alerting is now active!",
});
```

**Expected:** SMS arrives at your phone within 10 seconds.

---

## Environment Configuration

### Required

```bash
# Add to .env file
ADMIN_PHONE="+447700900123"  # MUST include +44 country code
```

**Format Rules:**
- Must start with `+` (international format)
- UK numbers: `+447...` (NOT `07...`)
- US numbers: `+1...`
- Test with: `echo $ADMIN_PHONE`

### Already Configured (No Changes Needed)

```bash
TWILIO_ACCOUNT_SID=ACxxx...
TWILIO_AUTH_TOKEN=xxx...
TWILIO_NUMBER=+447476955179
```

---

## Production Deployment

### Pre-Deployment

1. **Set production ADMIN_PHONE:**
   ```bash
   # In Railway/Heroku dashboard:
   ADMIN_PHONE=+447700900123
   ```

2. **Verify Twilio credits:**
   - Check Twilio dashboard for remaining balance
   - SMS cost: ~$0.01/message
   - Budget: ~$5/month for typical usage

### Deployment

```bash
# Apply migration
npx prisma migrate deploy

# Regenerate client
npx prisma generate

# Restart (auto-restart on Railway/Heroku)
```

### Post-Deployment Verification

```bash
# Check environment
curl https://your-app.railway.app/api/health

# Trigger test alert (via admin endpoint - to be added)
# OR wait for RuntimeMonitor to run (5 minutes)

# Check logs for alert delivery
grep "ALERT" logs/*
```

---

## Testing Checklist

### 1. Test SMS Delivery

```typescript
import { AlertService, AlertTemplates } from './services/AlertService';

await AlertService.sendCriticalAlert({
  type: "TEST_ALERT",
  severity: "HIGH",
  title: "Test Alert",
  message: "This is a test from JobRun alerting system.",
});
```

✅ **Success:** SMS received within 10 seconds
❌ **Failure:** Check console for fallback logs

---

### 2. Test Deduplication

```typescript
// Send same alert twice
await AlertService.sendCriticalAlert({
  type: "TEST_DEDUP",
  severity: "HIGH",
  resourceId: "test-123",
  title: "Dedup Test",
  message: "First send",
});

await AlertService.sendCriticalAlert({
  type: "TEST_DEDUP",
  severity: "HIGH",
  resourceId: "test-123",
  title: "Dedup Test",
  message: "Second send (should be suppressed)",
});
```

✅ **Success:** Only 1 SMS received
❌ **Failure:** Check alert_logs table for duplicate entries

---

### 3. Test Stuck Client Alert

```sql
-- Create stuck client
INSERT INTO clients (id, business_name, region, phone_number, payment_active)
VALUES ('test-alert-1', 'Test Alert Business', 'UK', '447700900999', true);

INSERT INTO onboarding_states (client_id, current_state, updated_at)
VALUES ('test-alert-1', 'S9_TEST_CALL', NOW() - INTERVAL '30 hours');
```

Trigger detection:
```typescript
import { StuckClientDetector } from './services/StuckClientDetector';
await StuckClientDetector.detectAndLog();
```

✅ **Success:** SMS with "Client stuck: Test Alert Business"

Cleanup:
```sql
DELETE FROM onboarding_states WHERE client_id = 'test-alert-1';
DELETE FROM clients WHERE id = 'test-alert-1';
DELETE FROM alert_logs WHERE alert_type = 'STUCK_CLIENT' AND resource_id = 'test-alert-1';
```

---

### 4. Test OpenAI Failure Alert

```typescript
import { OpenAIFailureTracker } from './services/OpenAIFailureTracker';

// Simulate 5 consecutive failures
for (let i = 0; i < 5; i++) {
  await OpenAIFailureTracker.recordFailure(`Test failure ${i + 1}`);
}
```

✅ **Success:** SMS with "OpenAI extraction failing"

Cleanup:
```typescript
OpenAIFailureTracker.reset();
DELETE FROM alert_logs WHERE alert_type = 'OPENAI_FAILURE';
```

---

## Monitoring in Production

### Daily Check

**Morning routine:**
```bash
# Check if any alerts sent overnight
curl http://localhost:3001/api/admin/alert-stats?hours=12 | jq
```

**Expected output:**
```json
{
  "total": 0,
  "byType": {},
  "bySeverity": {},
  "recentAlerts": []
}
```

**If alerts found:**
1. Review alert type
2. Take action per CRITICAL_ALERTING.md
3. Verify resolution

---

### Weekly Audit

```sql
-- Alert frequency by type (last 7 days)
SELECT
  alert_type,
  COUNT(*) as total,
  COUNT(DISTINCT resource_id) as unique_clients
FROM alert_logs
WHERE delivered_at > NOW() - INTERVAL '7 days'
GROUP BY alert_type
ORDER BY total DESC;
```

**Red flags:**
- POOL_EMPTY alerts >1/week → Need more numbers
- STUCK_CLIENT alerts >5/week → Onboarding UX issues
- OPENAI_FAILURE alerts >0 → API key / quota issues

---

## Troubleshooting

### No SMS Received

**1. Check ADMIN_PHONE:**
```bash
echo $ADMIN_PHONE
# Should output: +447700900123 (with +)
```

**2. Check Twilio credentials:**
```bash
curl "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"
# Should return 200 OK
```

**3. Check console logs:**
```bash
grep "CRITICAL ALERT" logs/* | tail -20
```

If you see fallback logs, SMS delivery failed but alert was logged.

**4. Check Twilio logs:**
- Visit https://console.twilio.com/monitor/logs/sms
- Look for failed messages
- Common issues: Invalid number, insufficient balance

---

### SMS Received but Wrong Content

**Check alert template:**
```typescript
// AlertTemplates are in src/services/AlertService.ts
export const AlertTemplates = {
  stuckClient: (client) => ({
    title: `Client stuck: ${client.businessName}`,
    message: `...`,
  }),
};
```

Edit templates in `AlertService.ts`, restart server.

---

### Too Many Alerts

**Temporary fix:**
```typescript
import { AlertService } from './services/AlertService';
const restore = AlertService.silenceAlerts();
// Alerts silenced - restore when ready
```

**Permanent fix:**
```typescript
// Edit src/services/AlertService.ts
const ALERT_CONFIG = {
  SUPPRESSION_WINDOW_HOURS: 12, // Increase from 6
  // OR
  ALERT_ON_SEVERITIES: ["HIGH"], // Remove MEDIUM
};
```

---

### Alert Log Table Growing Large

**Check size:**
```sql
SELECT
  COUNT(*) as total_alerts,
  pg_size_pretty(pg_total_relation_size('alert_logs')) as table_size
FROM alert_logs;
```

**Cleanup old alerts:**
```sql
-- Keep last 30 days only
DELETE FROM alert_logs WHERE delivered_at < NOW() - INTERVAL '30 days';
```

**Automatic cleanup (future):** Not implemented yet.

---

## Production Best Practices

### 1. Test in Staging First

Before deploying to production:
- Test all alert types in staging
- Verify SMS delivery
- Check deduplication works
- Confirm suppression window

### 2. Monitor Alert Volume

**Healthy system:**
- 0-2 alerts/day
- Most alerts are LOW/MEDIUM severity
- HIGH alerts rare (< 1/week)

**Unhealthy system:**
- >5 alerts/day
- Frequent HIGH severity
- Same alert repeatedly (dedup not working)

### 3. Review Alerts Weekly

```sql
-- Weekly alert summary
SELECT
  DATE_TRUNC('day', delivered_at) as day,
  alert_type,
  COUNT(*) as count
FROM alert_logs
WHERE delivered_at > NOW() - INTERVAL '7 days'
GROUP BY day, alert_type
ORDER BY day DESC, count DESC;
```

### 4. Keep ADMIN_PHONE Updated

If founder changes phone:
```bash
# Update immediately
export ADMIN_PHONE="+447700900456"  # New number

# In production (Railway/Heroku)
# Update environment variable in dashboard
# Restart application
```

---

## Rollback Plan

If alerting causes issues:

**1. Disable alerts temporarily:**
```typescript
// Add to src/index.ts startup
import { AlertService } from './services/AlertService';
AlertService.silenceAlerts();
console.warn('⚠️  ALERTS DISABLED FOR TROUBLESHOOTING');
```

**2. Revert database migration:**
```bash
# Drop alert_logs table
psql $DATABASE_URL -c "DROP TABLE alert_logs;"

# Remove from Prisma schema
# (delete AlertLog model)

npx prisma generate
```

**3. Remove integration code:**
```typescript
// Comment out in files:
// - StuckClientDetector.ts (lines 283-309)
// - TwilioNumberPoolService.ts (lines 94-99)
// - RuntimeMonitor.ts (lines 36-39)
// - OnboardingService.ts (lines 421, 429)
```

**Dependencies:** None external (Twilio already used for SMS)

---

## Quick Reference

**Environment variable:**
```bash
export ADMIN_PHONE="+447700900123"
```

**Test alert:**
```typescript
await AlertService.sendCriticalAlert({
  type: "TEST", severity: "HIGH", title: "Test", message: "Testing"
});
```

**Silence alerts:**
```typescript
const restore = AlertService.silenceAlerts();
```

**Check recent alerts:**
```sql
SELECT * FROM alert_logs ORDER BY delivered_at DESC LIMIT 10;
```

---

**Setup Time:** 5 minutes
**Dependencies:** Twilio (already configured)
**Maintenance:** Zero (runs automatically)
