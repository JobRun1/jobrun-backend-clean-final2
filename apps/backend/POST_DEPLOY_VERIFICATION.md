# POST-DEPLOY SAFETY VERIFICATION

**Purpose**: Detect successful deployment vs silent failure vs immediate rollback scenarios.

---

## VERIFICATION TIER 1: SCHEMA CORRECTNESS (BLOCKING)

Run immediately after migration completes.

### Database Structure Verification

```sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CHECK 1: All Client columns exist
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'clients'
  AND column_name IN (
    'onboardingComplete',
    'outboundPaused',
    'aiDisabled',
    'billingStatus',
    'paymentActive',
    'trialUsedAt',
    'pendingCancellation',
    'cancellationRequestedAt'
  )
ORDER BY column_name;

-- ✅ EXPECTED: 8 rows returned
-- ❌ ROLLBACK IF: < 8 rows (columns missing)

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CHECK 2: OnboardingState columns exist
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'onboarding_states'
  AND column_name IN (
    'clientId',
    'forwardingEnabled',
    'testCallDetected'
  )
ORDER BY column_name;

-- ✅ EXPECTED: 3 rows returned
-- ❌ ROLLBACK IF: < 3 rows (columns missing)

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CHECK 3: BillingStatus enum exists
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'BillingStatus'::regtype
ORDER BY enumsortorder;

-- ✅ EXPECTED: 5 rows (none, trial, active, canceled, past_due)
-- ❌ ROLLBACK IF: 0 rows (enum not created)

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CHECK 4: Foreign key constraint exists
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  constraint_name,
  table_name,
  constraint_type
FROM information_schema.table_constraints
WHERE constraint_name = 'onboarding_states_clientId_fkey';

-- ✅ EXPECTED: 1 row (FOREIGN KEY)
-- ❌ ROLLBACK IF: 0 rows (FK not created)

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CHECK 5: Unique constraint exists
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  constraint_name,
  table_name,
  constraint_type
FROM information_schema.table_constraints
WHERE constraint_name = 'onboarding_states_clientId_key';

-- ✅ EXPECTED: 1 row (UNIQUE)
-- ❌ ROLLBACK IF: 0 rows (UNIQUE not created)

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CHECK 6: Indexes created
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT indexname, tablename
FROM pg_indexes
WHERE indexname IN (
  'clients_onboardingComplete_idx',
  'clients_outboundPaused_idx',
  'clients_aiDisabled_idx',
  'clients_billingStatus_idx',
  'clients_pendingCancellation_idx',
  'onboarding_states_clientId_idx'
)
ORDER BY indexname;

-- ✅ EXPECTED: 6 rows
-- ⚠️ WARNING IF: < 6 rows (indexes missing, performance impact)
-- ❌ ROLLBACK IF: 0 rows (migration failed silently)
```

**Rollback triggers:**
- Any CHECK fails
- Missing columns
- Missing constraints
- Missing enum

---

## VERIFICATION TIER 2: DATA INTEGRITY (BLOCKING)

Run immediately after schema verification passes.

### Data Consistency Checks

```sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CHECK 7: All clients have safe defaults
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  COUNT(*) AS total_clients,
  COUNT(CASE WHEN onboardingComplete IS NULL THEN 1 END) AS null_onboarding,
  COUNT(CASE WHEN outboundPaused IS NULL THEN 1 END) AS null_outbound,
  COUNT(CASE WHEN aiDisabled IS NULL THEN 1 END) AS null_ai,
  COUNT(CASE WHEN billingStatus IS NULL THEN 1 END) AS null_billing
FROM clients;

-- ✅ EXPECTED: All null counts = 0
-- ❌ ROLLBACK IF: Any null count > 0 (default values not applied)

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CHECK 8: Backfill success rate
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  COUNT(*) AS total_onboarding_states,
  COUNT(customer_id) AS rows_with_customer_id,
  COUNT("clientId") AS rows_with_clientId,
  COUNT(customer_id) - COUNT("clientId") AS backfill_failures
FROM onboarding_states;

-- ✅ EXPECTED: backfill_failures = 0 (all rows backfilled)
-- ⚠️ WARNING IF: backfill_failures > 0 (orphaned rows exist)
-- ❌ ROLLBACK IF: backfill_failures > 10% of total (major backfill failure)

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CHECK 9: FK constraint integrity
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- This query should return 0 rows (all clientIds are valid)
SELECT
  os.id,
  os."clientId",
  os.customer_id
FROM onboarding_states os
LEFT JOIN clients c ON os."clientId" = c.id
WHERE os."clientId" IS NOT NULL
  AND c.id IS NULL;

-- ✅ EXPECTED: 0 rows (all clientIds reference valid clients)
-- ❌ ROLLBACK IF: > 0 rows (broken FK references)

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CHECK 10: No duplicate clientIds in onboarding_states
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT "clientId", COUNT(*)
FROM onboarding_states
WHERE "clientId" IS NOT NULL
GROUP BY "clientId"
HAVING COUNT(*) > 1;

-- ✅ EXPECTED: 0 rows (no duplicates)
-- ❌ ROLLBACK IF: > 0 rows (UNIQUE constraint will break code)
```

**Rollback triggers:**
- NULL values in NOT NULL columns
- Backfill failure rate > 10%
- Broken FK references
- Duplicate clientIds

---

## VERIFICATION TIER 3: APPLICATION HEALTH (BLOCKING)

Run immediately after code deployment.

### Application Startup Checks

```bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHECK 11: Prisma Client synchronized
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Look for Prisma client errors in logs
tail -n 100 /var/log/backend.log | grep -i "prisma" | grep -i "error"

# ✅ EXPECTED: No output (no Prisma errors)
# ❌ ROLLBACK IF: "column does not exist" errors
# ❌ ROLLBACK IF: "relation does not exist" errors
# ❌ ROLLBACK IF: "type does not exist" errors

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHECK 12: SystemGate initialized
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Look for SystemGate logs
tail -n 100 /var/log/backend.log | grep "SystemGate"

# ✅ EXPECTED: SystemGate logs present (guards active)
# ⚠️ WARNING IF: No SystemGate logs (guards may not be working)
# Note: This is OK if no requests have come in yet

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHECK 13: Application healthy
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

curl -s https://api.yourapp.com/health | jq '.'

# ✅ EXPECTED: 200 OK, JSON response
# ❌ ROLLBACK IF: 500 error
# ❌ ROLLBACK IF: Connection refused
# ❌ ROLLBACK IF: Timeout

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHECK 14: No critical errors in last 100 lines
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

tail -n 100 /var/log/backend.log | grep -i "error" | grep -v "404"

# ✅ EXPECTED: No critical errors (404s are OK)
# ⚠️ WARNING IF: < 5 non-critical errors
# ❌ ROLLBACK IF: > 5 critical errors
# ❌ ROLLBACK IF: Any "ECONNREFUSED" errors
# ❌ ROLLBACK IF: Any "column does not exist" errors
```

**Rollback triggers:**
- Prisma client errors
- Application health check fails
- Critical errors in logs
- Connection errors

---

## VERIFICATION TIER 4: FUNCTIONAL CORRECTNESS (NON-BLOCKING)

Run within first hour after deployment.

### SystemGate Verification

```bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHECK 15: SystemGate SOFT BLOCK working
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Trigger: Send SMS to incomplete client
# Expected log pattern:
tail -f /var/log/backend.log | grep "SystemGate.*SOFT BLOCK"

# ✅ EXPECTED: "SystemGate SOFT BLOCK" log appears
# ⚠️ WARNING IF: No SOFT BLOCK logs (guards may not be active)
# ❌ INVESTIGATE IF: Customer gets no response (guard broken)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHECK 16: SystemGate HARD BLOCK working
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Trigger: Set outboundPaused = true, send SMS
# Expected log pattern:
tail -f /var/log/backend.log | grep "SystemGate.*SMS_BLOCKED"

# ✅ EXPECTED: "SystemGate SMS_BLOCKED" log appears
# ✅ EXPECTED: No outbound SMS sent to customer
# ❌ INVESTIGATE IF: SMS sent despite outboundPaused = true

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHECK 17: OnboardingGuard validation working
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Trigger: Attempt completeOnboarding() without requirements
# Expected log pattern:
tail -f /var/log/backend.log | grep "OnboardingGuard.*VALIDATION FAILED"

# ✅ EXPECTED: "VALIDATION FAILED" log appears
# ✅ EXPECTED: onboardingComplete remains FALSE
# ❌ INVESTIGATE IF: Validation bypassed
```

**Investigation triggers:**
- Guards not firing
- Validation bypassed
- SMS sent despite kill switch

---

## VERIFICATION TIER 5: MONITORING SIGNALS

Monitor these continuously for first 24 hours.

### Success Signals ✅

**Logs:**
```bash
# SystemGate guard logs appearing
grep "SystemGate" /var/log/backend.log | tail -20

# Expected patterns:
# "[SystemGate] SOFT BLOCK: canRespondToCustomer"
# "[SystemGate] AI_DISABLED: client XYZ using deterministic fallback"
# "[SystemGate] NOTIFICATION_BLOCKED: Notifications paused"
```

**Metrics:**
- Error rate: < 0.1% (normal baseline)
- Response time: < 200ms p95 (normal baseline)
- CPU: < 60% (normal baseline)
- Memory: Stable, no leaks
- Database query time: < 50ms p95

**Database:**
```sql
-- New rows using new schema correctly
SELECT COUNT(*) FROM clients WHERE onboardingComplete = false;
-- Should increase as new clients onboard

SELECT COUNT(*) FROM onboarding_states WHERE "clientId" IS NOT NULL;
-- Should match total count (all backfilled)
```

---

### Silent Failure Signals ⚠️

**Logs:**
```bash
# No SystemGate logs (guards not active)
grep "SystemGate" /var/log/backend.log | wc -l
# ⚠️ WARNING IF: 0 after 1 hour of traffic

# No OnboardingGuard logs
grep "OnboardingGuard" /var/log/backend.log | wc -l
# ⚠️ WARNING IF: 0 after 1 hour of onboarding activity
```

**Metrics:**
- Error rate: 0% (too perfect, may indicate monitoring broken)
- No logs after 5 minutes (logging broken?)

**User reports:**
- "I'm not getting SMS responses" (SOFT BLOCK broken)
- "Kill switch not working" (HARD BLOCK broken)

**Action:**
- Investigate immediately
- Check if guards are being called
- Verify SystemGate imported correctly
- Check for import/require errors

---

### Immediate Rollback Signals ❌

**Logs:**
```bash
# Prisma client errors
grep "PrismaClientValidationError" /var/log/backend.log
# ❌ ROLLBACK IF: Any found

# Column does not exist errors
grep "column.*does not exist" /var/log/backend.log
# ❌ ROLLBACK IF: Any found

# Type errors
grep "TypeError.*clientId" /var/log/backend.log
# ❌ ROLLBACK IF: Pattern of same error
```

**Metrics:**
- Error rate: > 1% (10x normal)
- Response time: > 1000ms p95 (5x normal)
- CPU: > 90% (sustained)
- Database query time: > 500ms p95 (10x normal)

**Database:**
```sql
-- FK violations
SELECT * FROM pg_stat_database_conflicts WHERE database = 'jobrun_prod';
-- ❌ ROLLBACK IF: Conflicts detected

-- Deadlocks
SELECT * FROM pg_stat_database WHERE datname = 'jobrun_prod';
-- Check deadlocks column
-- ❌ ROLLBACK IF: Deadlocks increasing
```

**User reports:**
- Multiple users reporting SMS failures
- "500 Internal Server Error" on key endpoints
- "Can't complete onboarding" (validation too strict?)

**Action:**
- IMMEDIATE ROLLBACK
- Follow emergency rollback procedure
- Investigate in staging, not production

---

## VERIFICATION SUMMARY MATRIX

| Check | When | Pass | Warning | Rollback |
|-------|------|------|---------|----------|
| **Schema columns exist** | Immediately | 8/8 columns | - | < 8 columns |
| **Enum created** | Immediately | 5 values | - | 0 values |
| **Constraints exist** | Immediately | 2/2 constraints | - | < 2 constraints |
| **Indexes created** | Immediately | 6/6 indexes | < 6 indexes | 0 indexes |
| **Safe defaults applied** | Immediately | 0 NULLs | - | > 0 NULLs |
| **Backfill success** | Immediately | 100% | < 100% | < 90% |
| **FK integrity** | Immediately | 0 broken | - | > 0 broken |
| **Prisma client sync** | After deploy | No errors | - | Any errors |
| **Application health** | After deploy | 200 OK | - | 500/timeout |
| **SystemGate active** | First hour | Logs present | No logs | Guards failing |
| **OnboardingGuard active** | First hour | Logs present | No logs | Validation bypassed |
| **Error rate** | First 24h | < 0.1% | 0.1-1% | > 1% |
| **Response time** | First 24h | < 200ms | 200-500ms | > 500ms |

---

## QUICK REFERENCE COMMANDS

### One-Command Health Check

```bash
#!/bin/bash
# save as: verify-deployment.sh

echo "=== DEPLOYMENT VERIFICATION ==="
echo ""

echo "1. Schema check:"
psql $DATABASE_URL -c "
  SELECT COUNT(*) as client_columns
  FROM information_schema.columns
  WHERE table_name = 'clients'
  AND column_name IN ('onboardingComplete','outboundPaused','aiDisabled','billingStatus');
" | grep "4" && echo "✅ PASS" || echo "❌ FAIL"

echo ""
echo "2. Backfill check:"
psql $DATABASE_URL -c "
  SELECT COUNT(*) as total, COUNT(\"clientId\") as backfilled
  FROM onboarding_states;
" && echo "✅ PASS" || echo "❌ FAIL"

echo ""
echo "3. Application health:"
curl -sf https://api.yourapp.com/health > /dev/null && echo "✅ PASS" || echo "❌ FAIL"

echo ""
echo "4. Error rate (last 100 logs):"
ERROR_COUNT=$(tail -100 /var/log/backend.log | grep -i error | grep -v 404 | wc -l)
if [ $ERROR_COUNT -lt 5 ]; then
  echo "✅ PASS ($ERROR_COUNT errors)"
else
  echo "❌ FAIL ($ERROR_COUNT errors)"
fi

echo ""
echo "=== END VERIFICATION ==="
```

**Usage:**
```bash
chmod +x verify-deployment.sh
./verify-deployment.sh
```

**Expected output:**
```
=== DEPLOYMENT VERIFICATION ===

1. Schema check:
✅ PASS

2. Backfill check:
✅ PASS

3. Application health:
✅ PASS

4. Error rate (last 100 logs):
✅ PASS (2 errors)

=== END VERIFICATION ===
```

**If any FAIL:** Investigate immediately, consider rollback.

---

## CONCLUSION

Use this verification guide to:
1. Confirm successful deployment
2. Detect silent failures early
3. Identify rollback triggers quickly

**Remember:**
- Tier 1-3 checks are BLOCKING (must pass)
- Tier 4-5 checks are MONITORING (ongoing)
- When in doubt, ROLLBACK and investigate in staging
