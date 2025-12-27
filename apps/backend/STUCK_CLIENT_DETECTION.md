# Stuck Client Detection System

**Production-Hardening Subsystem for Operational Visibility**

## Purpose

Provides deterministic, time-based detection of clients blocked in onboarding who require manual intervention.

Answers the critical question: **"Which clients need my attention right now, and why?"**

---

## What "Stuck" Means

A client is considered **stuck** when they remain in a non-terminal onboarding state longer than expected without progressing.

### Threshold Definitions

| State | Threshold | Severity | Reason |
|-------|-----------|----------|--------|
| `S1_BUSINESS_TYPE_LOCATION` | 30 min | LOW | Simple question, should be quick |
| `S2_BUSINESS_NAME` | 30 min | LOW | Simple question |
| `S3_OWNER_NAME` | 30 min | LOW | Simple question |
| `S4_NOTIFICATION_PREF` | 30 min | LOW | Should confirm SMS quickly |
| `S5_CONFIRM_LIVE` | 2 hours | MEDIUM | May need time to decide; payment gate blocks here |
| `S6_PHONE_TYPE` | 1 hour | MEDIUM | Requires selection but straightforward |
| `S7_FWD_SENT` | 2 hours | MEDIUM | Setting up call forwarding |
| `S8_FWD_CONFIRM` | 2 hours | MEDIUM | Making test call preparation |
| `S9_TEST_CALL` | 24 hours | HIGH | **TERMINAL** - May never call without intervention |

### Terminal vs. Actionable States

**Terminal States** (require manual intervention):
- `S9_TEST_CALL` (24h+): Client must manually make test call; no auto-retry mechanism

**Actionable States** (may resolve on their own):
- All other states: Client can still progress if they respond

---

## How to Query Stuck Clients

### Option 1: HTTP Endpoint (Recommended)

**Get all stuck clients:**
```bash
curl http://localhost:3001/api/admin/stuck-clients
```

**Get only HIGH severity:**
```bash
curl http://localhost:3001/api/admin/stuck-clients?severity=HIGH
```

**Get only terminal (require intervention):**
```bash
curl http://localhost:3001/api/admin/stuck-clients?terminal=true
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-12-21T10:30:00.000Z",
    "total": 2,
    "byState": {
      "S5_CONFIRM_LIVE": 1,
      "S9_TEST_CALL": 1
    },
    "bySeverity": {
      "HIGH": 1,
      "MEDIUM": 1,
      "LOW": 0
    },
    "clients": [
      {
        "clientId": "cm1abc123xyz",
        "phoneNumber": "447700900123",
        "businessName": "ABC Plumbing",
        "currentState": "S9_TEST_CALL",
        "timeInStateMinutes": 1560,
        "timeInStateHuman": "1d 2h",
        "reason": "Hasn't completed test call (CRITICAL - no retry mechanism)",
        "severity": "HIGH",
        "isTerminal": true,
        "paymentActive": true,
        "twilioNumberAssigned": true,
        "lastUpdated": "2025-12-20T08:30:00.000Z",
        "stuckDetectedAt": "2025-12-21T08:00:00.000Z"
      },
      {
        "clientId": "cm1def456uvw",
        "phoneNumber": "447700900456",
        "businessName": "XYZ Electrician",
        "currentState": "S5_CONFIRM_LIVE",
        "timeInStateMinutes": 180,
        "timeInStateHuman": "3h",
        "reason": "Hasn't confirmed activation (may be blocked by payment gate)",
        "severity": "MEDIUM",
        "isTerminal": false,
        "paymentActive": false,
        "twilioNumberAssigned": false,
        "lastUpdated": "2025-12-21T07:30:00.000Z",
        "stuckDetectedAt": null
      }
    ]
  }
}
```

### Option 2: Direct Service Call (Programmatic)

```typescript
import { StuckClientDetector } from './services/StuckClientDetector';

// Get all stuck clients
const summary = await StuckClientDetector.detectStuckClients();

// Get only terminal stuck clients
const terminalClients = await StuckClientDetector.getTerminalStuckClients();

// Get by severity
const highSeverity = await StuckClientDetector.getStuckClientsBySeverity('HIGH');
```

### Option 3: Automated Monitoring (Production)

The system automatically checks for stuck clients every **5 minutes** in production via `RuntimeMonitor`.

Stuck conditions are logged as structured events:
```
STUCK_CLIENT_DETECTED {
  clientId: "cm1abc123xyz",
  phoneNumber: "447700900123",
  currentState: "S9_TEST_CALL",
  timeInState: "1d 2h",
  severity: "HIGH",
  reason: "Hasn't completed test call (CRITICAL - no retry mechanism)",
  isTerminal: true,
  timestamp: "2025-12-21T10:30:00.000Z"
}
```

---

## How to Manually Resolve Stuck Clients

### Scenario 1: Stuck at S9_TEST_CALL (Terminal)

**Problem:** Client paid, set up forwarding, but never made test call.

**Resolution:**
1. Call the client directly at `phoneNumber`
2. Walk them through making the test call
3. OR manually advance them to COMPLETE if forwarding is verified:

```sql
-- Verify forwarding is actually set up first!
UPDATE onboarding_states
SET current_state = 'COMPLETE',
    completed_at = NOW(),
    forwarding_enabled = true
WHERE client_id = 'cm1abc123xyz';
```

**Safety:** Only do this if you've verified call forwarding works.

---

### Scenario 2: Stuck at S5_CONFIRM_LIVE (Payment Gate)

**Problem:** Client said "YES" but payment never activated.

**Resolution:**
1. Check if they actually paid (verify in Stripe dashboard)
2. If payment confirmed, manually activate:

```sql
UPDATE clients
SET payment_active = true
WHERE id = 'cm1def456uvw';
```

3. Client can now reply "READY" to proceed

**Safety:** Verify payment in external system before enabling.

---

### Scenario 3: Stuck at S6_PHONE_TYPE (Pool Empty)

**Problem:** Client paid but pool ran out of numbers before allocation.

**Resolution:**
1. Add more numbers to pool:

```sql
INSERT INTO twilio_number_pool (phone_e164, status)
VALUES ('+447700900999', 'AVAILABLE');
```

2. Client can reply "READY" to retry allocation

**Safety:** Ensure Twilio number exists and is owned by your account.

---

### Scenario 4: Client Abandoned Onboarding

**Problem:** Client stuck for 7+ days, not responding.

**Resolution:**
1. Send manual SMS reminder
2. OR delete onboarding state to free up resources:

```sql
-- Only do this if client is truly abandoned
DELETE FROM onboarding_states
WHERE client_id = 'cm1xyz789abc';
```

**Safety:** Confirm client is non-responsive before deleting.

---

## Idempotency & Alert Suppression

The system tracks `stuckDetectedAt` to prevent repeated alerts for the same stuck condition.

**Alert Rules:**
- First detection: `stuckDetectedAt` is NULL → Log event, update timestamp
- Re-detection within 6 hours: `stuckDetectedAt` exists → Silent (no log)
- Re-detection after 6 hours: Re-alert (stuck condition persists)

This prevents log spam while ensuring long-term stuck clients are surfaced.

---

## Database Schema Changes

**New Field Added:**
```prisma
model OnboardingState {
  // ... existing fields ...

  stuckDetectedAt DateTime? @map("stuck_detected_at")
}
```

**Migration:**
```sql
ALTER TABLE onboarding_states
ADD COLUMN stuck_detected_at TIMESTAMP;
```

This is **additive only** - no destructive changes.

---

## Integration Points

### 1. RuntimeMonitor (Automatic)
- Runs every 5 minutes in production
- Calls `StuckClientDetector.detectAndLog()`
- Emits structured log events for new stuck conditions

### 2. Admin API Endpoints (Manual)
- `GET /api/admin/stuck-clients` - All stuck clients
- `GET /api/admin/stuck-clients?severity=HIGH` - Filter by severity
- `GET /api/admin/stuck-clients?terminal=true` - Terminal only
- `GET /api/admin/stuck-clients/terminal` - Shorthand for terminal

### 3. Programmatic Access
```typescript
import { StuckClientDetector } from './services/StuckClientDetector';

const summary = await StuckClientDetector.detectStuckClients();
```

---

## Limitations & Future Improvements

### Current Limitations

1. **No automated resolution**: System detects but does not auto-fix stuck states
2. **No external alerting**: Logs to console only (no PagerDuty/Slack integration)
3. **No retry mechanisms**: Terminal states require manual intervention
4. **No proactive outreach**: Does not automatically SMS stuck clients
5. **No historical tracking**: Only shows current stuck state, not history

### Recommended Next Steps

1. **Add external alerting**:
   - Integrate with PagerDuty for HIGH severity alerts
   - Send Slack notifications for MEDIUM severity
   - Daily digest email for LOW severity

2. **Add retry mechanisms**:
   - Auto-SMS clients stuck >12 hours with helpful reminder
   - Auto-advance S9_TEST_CALL if forwarding verified externally

3. **Add historical tracking**:
   - Log stuck detections to database table
   - Track time-to-resolution metrics
   - Build funnel analytics (conversion rate by state)

4. **Add preventative measures**:
   - Pool depletion alerts before empty
   - Payment gate follow-up automation
   - Test call deadline reminders

---

## Quick Reference

**One command to see all stuck clients:**
```bash
curl http://localhost:3001/api/admin/stuck-clients | jq
```

**Find clients stuck >24 hours (terminal):**
```bash
curl http://localhost:3001/api/admin/stuck-clients/terminal | jq
```

**Check if stuck detection is running:**
```bash
# Look for this in logs every 5 minutes:
grep "STUCK_DETECTOR" /var/log/jobrun.log
```

**Manually trigger detection (dev/test):**
```typescript
import { StuckClientDetector } from './services/StuckClientDetector';
await StuckClientDetector.detectAndLog();
```

---

## Troubleshooting

**Q: Why aren't stuck clients being detected?**

A: Check:
1. RuntimeMonitor is running (production only)
2. Database contains `onboarding_states` with `current_state != 'COMPLETE'`
3. States have been in same state > threshold time
4. Check logs for `STUCK_DETECTOR` messages

**Q: Why am I getting repeated alerts for the same client?**

A: Check `stuckDetectedAt` field. If it's being updated correctly, alerts should suppress for 6 hours. If not, the update query may be failing.

**Q: Can I change the thresholds?**

A: Yes. Edit `STUCK_THRESHOLDS` array in `services/StuckClientDetector.ts`. No migration required (thresholds are code-only).

**Q: What if a client is "stuck" but shouldn't be?**

A: False positives are possible if thresholds are too aggressive. Adjust thresholds upward for specific states if needed. Terminal detection (S9_TEST_CALL at 24h) is intentionally conservative.

---

**Last Updated:** 2025-12-21
**Version:** 1.0.0
**Status:** Production-Ready
