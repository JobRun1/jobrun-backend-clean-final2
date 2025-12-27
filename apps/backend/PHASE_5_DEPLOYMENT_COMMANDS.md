# PHASE 5 DEPLOYMENT - EXECUTION CHECKLIST

## ✅ STEP 1: VERIFY DATABASE CONNECTIVITY

```bash
cd apps/backend

# Test 1: Check if Prisma can connect
npx prisma db pull --force
# Expected: Schema pulled successfully

# Test 2: Simple query to verify read access
npx prisma studio --browser none &
# Kill after 2 seconds (Ctrl+C)
# Expected: Prisma Studio starts without connection errors

# Test 3: Verify current schema state
npx prisma validate
# Expected: "The schema is valid"
```

**If any test fails**: Stop here. Do NOT proceed with migration until DB connectivity is stable.

---

## ✅ STEP 2: CHECK MIGRATION STATUS

```bash
# List all migrations and their status
npx prisma migrate status

# Expected output should show:
# Your database is managed by Prisma Migrate.
#
# Following migrations have not yet been applied:
# 20241226_phase_5_admin_control
#
# To apply pending migration(s), run:
# prisma migrate deploy
```

**Red flags**:
- ❌ "Database schema is not in sync with migration history"
  → Fix: Run `npx prisma migrate resolve --applied <migration-name>` for already-applied migrations
- ❌ "Migration failed to apply"
  → Fix: Check migration SQL for errors

**If migration status looks wrong**: Take a backup and contact senior engineer.

---

## ✅ STEP 3: BACKUP DATABASE (PRODUCTION ONLY)

**If this is production**:

```bash
# Railway CLI backup (if using Railway)
railway run pg_dump > backup_pre_phase5_$(date +%Y%m%d_%H%M%S).sql

# OR via Railway dashboard:
# 1. Go to your project
# 2. Click "Database" tab
# 3. Click "Backups"
# 4. Create manual backup snapshot
```

**If this is development/staging**: Skip backup (you can reset DB if needed)

---

## ✅ STEP 4: APPLY PHASE 5 MIGRATION

```bash
cd apps/backend

# Apply pending migrations (Phase 5 only)
npx prisma migrate deploy

# Expected output:
# Applying migration `20241226_phase_5_admin_control`
# The following migration(s) have been applied:
#
# migrations/
#   └─ 20241226_phase_5_admin_control/
#      └─ migration.sql
#
# All migrations have been successfully applied.
```

**If migration fails**:
1. Note the EXACT error message
2. DO NOT retry blindly
3. Check if partial application occurred (verify in STEP 5)
4. Contact senior engineer with error details

---

## ✅ STEP 5: VERIFY SCHEMA CHANGES

Run these SQL queries to verify Phase 5 schema is live:

```bash
# Open Prisma Studio for manual inspection
npx prisma studio

# OR run verification queries directly:
```

### Verification SQL Queries

Copy these into your database client (Prisma Studio, psql, pgAdmin, etc.):

```sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICATION QUERY 1: Check AlertLog acknowledgment fields
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'alert_logs'
  AND column_name IN ('acknowledged_at', 'acknowledged_by', 'resolution')
ORDER BY column_name;

-- Expected: 3 rows
-- acknowledged_at   | timestamp with time zone | YES
-- acknowledged_by   | text                     | YES
-- resolution        | text                     | YES

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICATION QUERY 2: Check unique constraint was dropped
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'alert_logs'
  AND constraint_type = 'UNIQUE';

-- Expected: 0 rows (unique constraint should be GONE)

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICATION QUERY 3: Check ClientControls table exists
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'client_controls'
ORDER BY ordinal_position;

-- Expected: Multiple rows including:
-- id                        | text
-- client_id                 | text
-- ops_alerts_muted          | boolean
-- payment_gate_alerted_at   | timestamp
-- payment_gate_alert_count  | integer
-- outbound_paused           | boolean
-- ai_disabled               | boolean

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICATION QUERY 4: Check AdminAction table exists
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'admin_actions'
ORDER BY ordinal_position;

-- Expected: Multiple rows including:
-- id          | text
-- created_at  | timestamp
-- admin_id    | text
-- client_id   | text
-- action      | text
-- reason      | text
-- metadata    | jsonb

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICATION QUERY 5: Check ClientBilling table exists
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'client_billing'
ORDER BY ordinal_position;

-- Expected: Multiple rows including:
-- id                        | text
-- client_id                 | text
-- status                    | BillingStatus (enum)
-- payment_source            | PaymentSource (enum)
-- trial_started_at          | timestamp
-- stripe_customer_id        | text

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICATION QUERY 6: Verify BillingStatus enum values
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT enumlabel
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'BillingStatus'
ORDER BY e.enumsortorder;

-- Expected: 7 values
-- TRIAL_PENDING
-- TRIAL_ACTIVE
-- TRIAL_EXPIRED
-- ACTIVE
-- DELINQUENT
-- CANCELED
-- SUSPENDED

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICATION QUERY 7: Check data migration from clients to client_controls
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  COUNT(*) as total_clients,
  COUNT(cc.id) as clients_with_controls,
  COUNT(*) - COUNT(cc.id) as missing_controls
FROM clients c
LEFT JOIN client_controls cc ON c.id = cc.client_id;

-- Expected:
-- total_clients | clients_with_controls | missing_controls
-- X             | X                     | 0
-- (missing_controls should be 0 if migration worked)
```

### Verification Checklist

After running queries, verify:

- [ ] `alert_logs` has `acknowledged_at`, `acknowledged_by`, `resolution` columns
- [ ] `alert_logs` has NO unique constraint on (alert_type, alert_key)
- [ ] `client_controls` table exists with all expected columns
- [ ] `admin_actions` table exists with all expected columns
- [ ] `client_billing` table exists with all expected columns
- [ ] `BillingStatus` enum has 7 values (TRIAL_PENDING through SUSPENDED)
- [ ] `PaymentSource` enum exists with 4 values (NONE, STRIPE, MANUAL, WAIVED)
- [ ] All clients have corresponding `client_controls` records (missing_controls = 0)

**If ANY check fails**: DO NOT PROCEED. Migration did not complete successfully.

---

## ✅ STEP 6: REGENERATE PRISMA CLIENT

```bash
cd apps/backend

# Regenerate Prisma client with new schema
npx prisma generate

# Expected output:
# ✔ Generated Prisma Client (v5.x.x) to ./node_modules/@prisma/client

# Verify no TypeScript errors
npx tsc --noEmit

# Expected: No output (success)
```

---

## ✅ STEP 7: RESTART BACKEND APPLICATION

```bash
cd apps/backend

# Build
npm run build

# Start (or restart your process)
npm run start

# OR if using pm2/nodemon:
pm2 restart jobrun-backend
# OR
nodemon restart
```

**Watch logs for**:
- ✅ NO `[ALERT_SUPPRESSED]` messages (guard should pass now)
- ✅ Backend starts without errors
- ✅ No Prisma client errors

---

## ✅ STEP 8: TEST ALERT ACKNOWLEDGMENT LOGIC

### Test 1: Verify Emergency Guard NOW PASSES

**Expected behavior**:
- Schema check succeeds (acknowledged_at column exists)
- Guard does NOT suppress alerts
- NO `[ALERT_SUPPRESSED]` messages in logs

**How to verify**:
```bash
# Monitor logs when an alert would fire
# (e.g., stuck client detection runs)

# Look for:
# ✅ NO: "[ALERT_SUPPRESSED] Phase 5 schema not deployed"
# ✅ YES: Normal alert flow (deduplication, delivery, logging)
```

### Test 2: Verify Alert Deduplication Works

**Expected behavior**:
1. First alert fires → SMS sent
2. Second alert (same condition) → suppressed (unacknowledged)
3. After acknowledgment → 24h cooldown
4. After 24h → can re-alert if condition persists

**Manual test** (optional):
```typescript
// In Prisma Studio or via script:
// 1. Create a test alert
await prisma.alertLog.create({
  data: {
    alertType: 'TEST_ALERT',
    alertKey: 'test:123',
    severity: 'HIGH',
    deliveredAt: new Date(),
    channel: 'SMS',
  }
});

// 2. Try to send same alert again
// Should be suppressed (recent unacknowledged alert exists)

// 3. Acknowledge the alert
await prisma.alertLog.update({
  where: { id: '<alert_id>' },
  data: {
    acknowledgedAt: new Date(),
    acknowledgedBy: 'test-admin',
    resolution: 'Testing acknowledgment logic',
  },
});

// 4. Try to send same alert within 24h
// Should still be suppressed (cooldown period)

// 5. Simulate 24h passing (update acknowledgedAt to 25h ago)
await prisma.alertLog.update({
  where: { id: '<alert_id>' },
  data: {
    acknowledgedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
  },
});

// 6. Try to send same alert again
// Should fire again (cooldown expired)
```

---

## ✅ STEP 9: REMOVE EMERGENCY GUARD

**Only proceed if**:
- [ ] Phase 5 migration applied successfully
- [ ] All verification queries passed
- [ ] Backend running without errors
- [ ] NO `[ALERT_SUPPRESSED]` messages in logs
- [ ] Alert deduplication working correctly

### Lines to Delete from AlertService.ts

**DELETE Block 1** (Emergency guard in sendCriticalAlert method):

**File**: `apps/backend/src/services/AlertService.ts`
**Lines**: 135-154

```typescript
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
```

**DELETE Block 2** (checkPhase5SchemaExists method):

**File**: `apps/backend/src/services/AlertService.ts`
**Lines**: 316-356

```typescript
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
```

### Automated Removal Script

```bash
cd apps/backend
```

Run this command to remove the guard automatically:

```bash
# This will be done manually via Edit tool - see next step
```

---

## ✅ STEP 10: VERIFY ALERTS STILL WORK AFTER GUARD REMOVAL

After removing the guard:

```bash
cd apps/backend

# 1. Verify TypeScript compiles
npx tsc --noEmit
# Expected: No output (success)

# 2. Rebuild
npm run build

# 3. Restart backend
npm run start

# 4. Monitor logs
# Expected:
# - Alerts fire normally
# - Deduplication works
# - Acknowledgment logic active
# - NO "[ALERT_SUPPRESSED]" messages
# - NO "checkPhase5SchemaExists" function calls
```

---

## ✅ STEP 11: FINAL VERIFICATION

Run through this checklist:

- [ ] Phase 5 migration applied successfully
- [ ] All schema verification queries passed
- [ ] Emergency guard removed from AlertService.ts
- [ ] TypeScript compiles clean
- [ ] Backend running without errors
- [ ] Alerts firing normally (if conditions exist)
- [ ] Alert acknowledgment prevents duplicates
- [ ] 24h cooldown working
- [ ] No `[ALERT_SUPPRESSED]` messages in logs

**If all checks pass**: Phase 5 deployment is COMPLETE ✅

---

## 🚨 ROLLBACK PLAN (If Something Breaks)

### If Migration Fails Partway

```bash
# DO NOT run prisma migrate reset (will lose data)

# Instead:
# 1. Note EXACT error message
# 2. Check which tables were created:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

# 3. If client_controls exists but data not migrated:
# Re-run migration manually (it's idempotent)
npx prisma migrate deploy

# 4. If migration corrupted schema:
# Contact senior engineer IMMEDIATELY
```

### If Alerts Break After Guard Removal

```bash
# 1. Restore emergency guard (git checkout)
git checkout apps/backend/src/services/AlertService.ts

# 2. Rebuild and restart
npm run build && npm run start

# 3. Investigate logs for error
```

---

## 📊 SUCCESS CRITERIA

Phase 5 is COMPLETE when:

1. ✅ Migration `20241226_phase_5_admin_control` applied
2. ✅ All new tables exist (client_controls, admin_actions, client_billing)
3. ✅ Alert acknowledgment fields exist in alert_logs
4. ✅ Unique constraint removed from alert_logs
5. ✅ Emergency guard removed from AlertService.ts
6. ✅ TypeScript compiles clean
7. ✅ Backend running without errors
8. ✅ Alerts work with acknowledgment logic
9. ✅ No `[ALERT_SUPPRESSED]` messages in logs
10. ✅ Billing invariants intact (no data loss)

---

**Ready to execute?** Start with STEP 1 and work through sequentially.
