# Stuck Client Detection - Quick Reference Card

## One-Liner Commands

```bash
# See ALL stuck clients (sorted by severity)
curl http://localhost:3001/api/admin/stuck-clients | jq '.data.clients[] | {name: .businessName, state: .currentState, time: .timeInStateHuman, severity: .severity}'

# See ONLY critical (requires immediate action)
curl http://localhost:3001/api/admin/stuck-clients/terminal | jq

# Count stuck clients by severity
curl http://localhost:3001/api/admin/stuck-clients | jq '.data.bySeverity'

# List phone numbers of HIGH severity stuck clients
curl http://localhost:3001/api/admin/stuck-clients?severity=HIGH | jq '.data.clients[] | .phoneNumber'
```

---

## Severity Triage

| Severity | Action | Timeframe |
|----------|--------|-----------|
| **HIGH** | Call client immediately | Within 1 hour |
| **MEDIUM** | Investigate & resolve | Within 4 hours |
| **LOW** | Monitor | Within 24 hours |

---

## Common Stuck States & Fixes

### S9_TEST_CALL (HIGH - Terminal)
**Symptom:** Client stuck >24h after forwarding setup
**Fix:** Call client at `phoneNumber`, guide through test call
**SQL:** See STUCK_CLIENT_DETECTION.md → "Scenario 1"

### S5_CONFIRM_LIVE (MEDIUM)
**Symptom:** Client stuck >2h, `paymentActive: false`
**Fix:** Check Stripe, manually activate if paid
**SQL:**
```sql
UPDATE clients SET payment_active = true WHERE id = 'xxx';
```

### S6_PHONE_TYPE (MEDIUM)
**Symptom:** Client stuck, `twilioNumberAssigned: false`
**Fix:** Pool empty - add numbers to pool
**SQL:**
```sql
INSERT INTO twilio_number_pool (phone_e164, status)
VALUES ('+447700900999', 'AVAILABLE');
```

### S1-S4 (LOW)
**Symptom:** Client stuck >30 min
**Fix:** Likely abandoned - wait 24h, then send reminder SMS

---

## Response Templates

### For S9 Test Call
```
Hi [name], this is JobRun support. I noticed you're ready to go live but
haven't completed the test call yet. Can I walk you through it now?
Should take 60 seconds. Reply YES if you're free.
```

### For Payment Block
```
Hi [name], your payment for JobRun is confirmed! You're all set.
Reply READY to continue setup.
```

### For Abandoned Onboarding
```
Hi [name], you started setting up JobRun but didn't finish.
Still interested? Reply YES and I'll help you complete setup in 2 minutes.
```

---

## Daily Checklist

```
[ ] Morning (9 AM): Check terminal stuck clients
    curl .../stuck-clients/terminal

[ ] Midday (1 PM): Check HIGH + MEDIUM severity
    curl .../stuck-clients?severity=MEDIUM

[ ] Evening (5 PM): Review all stuck clients for tomorrow
    curl .../stuck-clients
```

---

## Thresholds Reference

| State | Time | Severity | Terminal? |
|-------|------|----------|-----------|
| S1 | 30m | LOW | No |
| S2 | 30m | LOW | No |
| S3 | 30m | LOW | No |
| S4 | 30m | LOW | No |
| S5 | 2h | MEDIUM | No |
| S6 | 1h | MEDIUM | No |
| S7 | 2h | MEDIUM | No |
| S8 | 2h | MEDIUM | No |
| S9 | 24h | HIGH | **YES** |

---

## Manual SQL Queries

**See all incomplete onboarding:**
```sql
SELECT
  c.business_name,
  c.phone_number,
  os.current_state,
  EXTRACT(EPOCH FROM (NOW() - os.updated_at))/3600 as hours_stuck
FROM clients c
JOIN onboarding_states os ON c.id = os.client_id
WHERE os.current_state != 'COMPLETE'
ORDER BY os.updated_at ASC;
```

**Force-complete stuck client (dangerous!):**
```sql
-- ONLY if you've verified manually
UPDATE onboarding_states
SET current_state = 'COMPLETE', completed_at = NOW()
WHERE client_id = 'xxx';
```

**Reset stuck client to earlier state:**
```sql
-- Rollback to S5 if stuck at S9 due to error
UPDATE onboarding_states
SET current_state = 'S5_CONFIRM_LIVE', stuck_detected_at = NULL
WHERE client_id = 'xxx';
```

---

## Alarm Thresholds

Set these up in your monitoring:

| Metric | Warning | Critical |
|--------|---------|----------|
| Total stuck clients | >5 | >10 |
| HIGH severity | >1 | >3 |
| Same client stuck >48h | N/A | >0 |

---

## Log Patterns

**Look for these in production logs:**

```bash
# Good - system working
✅ [STUCK_DETECTOR] No stuck clients detected

# Action needed - stuck clients found
⚠️  [STUCK_DETECTOR] STUCK CLIENTS DETECTED: 3

# Critical - specific stuck client
STUCK_CLIENT_DETECTED { severity: 'HIGH', ... }
```

---

## Quick Diagnosis

**Q: Why is client stuck?**

1. Check `paymentActive`: If false at S5, payment issue
2. Check `twilioNumberAssigned`: If false at S6, pool issue
3. Check `isTerminal`: If true, they won't auto-progress
4. Check `timeInStateHuman`: If >48h, likely abandoned

**Q: Should I intervene?**

- HIGH severity: Always
- MEDIUM + payment issue: Yes
- MEDIUM + >12h: Yes
- LOW + <6h: No, wait
- LOW + >24h: Send reminder

---

## Emergency Procedures

### Pool Completely Empty (5+ clients stuck)
```bash
# 1. Add emergency numbers
INSERT INTO twilio_number_pool (phone_e164, status) VALUES
  ('+447700900111', 'AVAILABLE'),
  ('+447700900222', 'AVAILABLE'),
  ('+447700900333', 'AVAILABLE');

# 2. Tell stuck clients to retry
# (they can reply "READY" to retry allocation)
```

### Mass Payment Activation (Stripe batch confirmed)
```sql
-- If you've confirmed 5 payments in Stripe
UPDATE clients
SET payment_active = true
WHERE phone_number IN ('447700900111', '447700900222', ...);
```

### Reset Stuck Detection (if malfunctioning)
```sql
-- Clears all stuck alerts (they'll re-trigger next check)
UPDATE onboarding_states SET stuck_detected_at = NULL;
```

---

## Performance Notes

**Fast Queries (<100ms):**
- `/stuck-clients` with <50 incomplete states
- `/stuck-clients/terminal` always fast (filters after query)
- `/stuck-clients?severity=HIGH` always fast (filters after query)

**Slow Queries (>500ms):**
- `/stuck-clients` with >500 incomplete states (unlikely)

**Optimization:** Database index on `current_state` already exists.

---

## Bookmarks

**Production Endpoints:**
```
https://your-app.railway.app/api/admin/stuck-clients
https://your-app.railway.app/api/admin/stuck-clients/terminal
https://your-app.railway.app/api/admin/stuck-clients?severity=HIGH
```

**Documentation:**
- Full Guide: `STUCK_CLIENT_DETECTION.md`
- Examples: `STUCK_CLIENT_EXAMPLE_OUTPUT.md`
- Setup: `STUCK_CLIENT_SETUP.md`
- This Card: `STUCK_CLIENT_QUICK_REFERENCE.md`

---

**Print this page and keep it visible while operating the system.**
