# PRISMA MIGRATION AUDIT & P3006 ERROR RESOLUTION

**Date**: 2025-12-26
**Status**: CRITICAL - Migration failure blocking development

---

## EXECUTIVE SUMMARY

The P3006 error occurs because migration `20241223_align_schema_with_production` contains invalid SQL that references a column (`customer_id`) that has never existed in any schema. Additionally, the migration history is inconsistent with the current schema.prisma, requiring a coordinated fix.

---

## ROOT CAUSE ANALYSIS

### The P3006 Error

**Error Message**:
```
Migration '20241223_align_schema_with_production' failed to apply cleanly to the shadow database.
Error: column os.customer_id does not exist
```

**Location**: `apps/backend/prisma/migrations/20241223_align_schema_with_production/migration.sql` lines 202-206

**Problematic SQL**:
```sql
UPDATE "onboarding_states" os
SET "clientId" = c."clientId"
FROM "customers" c
WHERE os."customer_id" = c."id"  -- ❌ customer_id column does not exist
  AND os."clientId" IS NULL;
```

**Why It Fails**:
1. Shadow database is created from scratch by applying all migrations in order
2. Baseline migration `20241221_initial_clean_baseline` creates `onboarding_states` table with `client_id` field (NOT `customer_id`)
3. When shadow DB reaches `20241223_align_schema_with_production`, it tries to query `os."customer_id"` which has never existed
4. Migration fails → P3006 error

---

## MIGRATION HISTORY ANALYSIS

### Migration Timeline

| Date | Migration | Purpose | Status |
|------|-----------|---------|--------|
| 20241218 | add_onboarding_state | STUB (already in prod) | ✅ |
| 20241219 | fix_onboarding_enum_name | STUB (already in prod) | ✅ |
| 20241221 | initial_clean_baseline | Creates full schema | ✅ BASELINE |
| 20241223 | add_ops_alert_fields | Adds alert fields to clients table | ✅ |
| 20241223 | align_schema_with_production | **CONTAINS INVALID SQL** | ❌ P3006 |
| 20241224 | add_alert_log_and_twilio_pool | Creates AlertLog + Twilio pool | ⏸️ Blocked |
| 20251213 | init_clean | STUB (already in prod) | ✅ |
| 20251214 | bootstrap_default_client | STUB (already in prod) | ✅ |

### Key Findings

1. **Baseline Schema** (`20241221_initial_clean_baseline`):
   - Creates `onboarding_states` with `client_id` field (NOT `customer_id`)
   - Creates `alert_logs` with UNIQUE constraint on `(alert_type, alert_key)`
   - No alert fields on clients table

2. **Invalid Migration** (`20241223_align_schema_with_production`):
   - Lines 202-206 reference non-existent `customer_id` column
   - This backfill logic was likely copied from a different schema version
   - **MUST BE REMOVED**

3. **Schema Drift**:
   - Migration `20241223_add_ops_alert_fields` adds alert fields to `clients` table
   - Current `schema.prisma` expects these fields in `client_controls` table
   - Phase 5 implementation requires fields to be in ClientControls

---

## SCHEMA DRIFT ANALYSIS

### Current schema.prisma vs Migration State

| Feature | schema.prisma | Migration State | Action Needed |
|---------|--------------|-----------------|---------------|
| Alert fields location | ClientControls | clients table | Migrate to ClientControls |
| AlertLog unique constraint | Removed (append-only) | UNIQUE constraint exists | Drop constraint |
| Alert acknowledgment fields | Defined (acknowledgedAt, acknowledgedBy, resolution) | Not in DB | Add fields |
| ClientControls table | Defined | Not created | Create table |
| ClientBilling table | Defined | Not created | Create table |
| AdminAction table | Defined | Not created | Create table |
| BillingStatus enum | Defined | OLD enum (from align migration) | Replace with new enum |
| PaymentSource enum | Defined | Not created | Create enum |

---

## RECOVERY STRATEGY

### Option 1: Edit & Squash (RECOMMENDED)

**Pros**:
- Clean migration history
- Aligns migrations with current schema
- Safe for production (no data loss)

**Cons**:
- Requires editing multiple migrations
- Requires careful testing

**Steps**:
1. Edit `20241223_align_schema_with_production` to remove invalid backfill
2. Create new Phase 5 migration with all schema changes
3. Test shadow DB creation
4. Verify against production schema

### Option 2: Mark as Applied (RISKY)

**Pros**:
- Quick fix for local development

**Cons**:
- Doesn't fix underlying issue
- May cause drift with production
- Not recommended

**Command**:
```bash
npx prisma migrate resolve --applied 20241223_align_schema_with_production
```

---

## RECOMMENDED SOLUTION

### Step 1: Fix Broken Migration

**File**: `apps/backend/prisma/migrations/20241223_align_schema_with_production/migration.sql`

**Action**: Remove lines 197-220 (entire backfill section)

**Justification**:
- The backfill references a column that doesn't exist
- If production has data, this backfill already ran (or was unnecessary)
- Removing it makes migration idempotent and shadow-DB safe

### Step 2: Create Phase 5 Migration

**Migration Name**: `20241226_phase_5_admin_control`

**Required Changes**:
1. Drop UNIQUE constraint on AlertLog (alertType, alertKey)
2. Add acknowledgment fields to AlertLog:
   - `acknowledged_at` (TIMESTAMP NULL)
   - `acknowledged_by` (TEXT NULL)
   - `resolution` (TEXT NULL)
3. Create BillingStatus enum (new values)
4. Create PaymentSource enum
5. Create ClientBilling table
6. Create ClientControls table
7. Migrate alert fields from clients → client_controls:
   - `ops_alerts_muted`
   - `payment_gate_alerted_at`
   - `payment_gate_alert_count`
8. Create AdminAction table
9. Add indexes for new fields

### Step 3: Verification Checklist

- [ ] Shadow database creation succeeds
- [ ] `npx prisma migrate dev` runs without errors
- [ ] `npx prisma generate` succeeds
- [ ] TypeScript compilation succeeds
- [ ] Backend boots without errors
- [ ] All Phase 5 services compile (AdminActions, AdminReadModel, AlertService)
- [ ] StuckClientDetector uses ClientControls correctly

---

## EXACT COMMANDS TO RUN

### 1. Fix the broken migration

```bash
# Backup the migration file first
cp apps/backend/prisma/migrations/20241223_align_schema_with_production/migration.sql apps/backend/prisma/migrations/20241223_align_schema_with_production/migration.sql.backup

# Edit the file to remove lines 197-220 (the backfill section)
# Use your text editor or the Edit tool
```

### 2. Reset Prisma shadow database

```bash
# This forces Prisma to recreate shadow DB from scratch
cd apps/backend
rm -rf node_modules/.prisma
npx prisma generate
```

### 3. Create Phase 5 migration

```bash
cd apps/backend
npx prisma migrate dev --name phase_5_admin_control
```

### 4. Verify migration succeeded

```bash
# Check migration status
npx prisma migrate status

# Regenerate Prisma client
npx prisma generate

# Build TypeScript
npm run build
```

### 5. Test backend boot

```bash
# Start backend to verify all services load
npm run dev
```

---

## PRODUCTION SAFETY

### Pre-Flight Checks

Before applying any migration to production:

1. **Verify production schema state**:
   ```sql
   -- Check if alert fields exist on clients table
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'clients'
   AND column_name IN ('opsAlertsMuted', 'paymentGateAlertedAt', 'paymentGateAlertCount');

   -- Check if client_controls table exists
   SELECT * FROM information_schema.tables WHERE table_name = 'client_controls';

   -- Check AlertLog constraint
   SELECT constraint_name FROM information_schema.table_constraints
   WHERE table_name = 'alert_logs' AND constraint_type = 'UNIQUE';
   ```

2. **Backup production database** before migration

3. **Test migration on staging** environment first

### Migration Safety Features

- All DDL operations use `IF NOT EXISTS` / `IF EXISTS` where possible
- Data migrations happen before constraint additions
- Default values prevent NULL violations
- Indexes created CONCURRENTLY (no table locks)

---

## PHASE 5 MIGRATION CONTENTS

The Phase 5 migration will need to handle these schema changes:

1. **AlertLog → Append-only**
   - Drop UNIQUE constraint on (alert_type, alert_key)
   - Add index on alert_type (for queries)
   - Add index on alert_key (for queries)
   - Add acknowledgment fields

2. **Client → ClientControls**
   - Create client_controls table
   - Copy alert fields from clients to client_controls
   - Create ClientControls records for all existing clients
   - (Keep fields on clients for backward compatibility during transition)

3. **Billing Models**
   - Create BillingStatus enum (7 states)
   - Create PaymentSource enum (4 sources)
   - Create client_billing table
   - Migrate old billing fields from clients

4. **Audit Trail**
   - Create admin_actions table for operator audit log

---

## NEXT STEPS

1. **Immediate**: Fix broken migration (remove backfill logic)
2. **Next**: Create Phase 5 migration
3. **Then**: Verify backend boots clean
4. **Finally**: Update Phase 5 routes and complete implementation

---

## FILES TO MODIFY

1. `apps/backend/prisma/migrations/20241223_align_schema_with_production/migration.sql`
   - Remove lines 197-220 (invalid backfill)

2. Create new migration file (Prisma will generate)
   - `apps/backend/prisma/migrations/20241226_phase_5_admin_control/migration.sql`

---

## RISK ASSESSMENT

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Shadow DB still fails | Low | High | Test immediately after fix |
| Production drift | Medium | High | Audit production schema first |
| Data loss during migration | Low | Critical | Use additive-only operations |
| TypeScript errors after migration | Medium | Medium | Regenerate Prisma client, rebuild |

---

**Status**: Ready for execution
**Blockers**: None (database connectivity not required for local fix)
**Estimated Time**: 30 minutes for fix + testing
