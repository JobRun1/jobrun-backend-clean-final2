# PHASE 1: PRODUCTION-SAFE DATABASE MIGRATION

## CRITICAL: READ BEFORE EXECUTING

This migration brings your production database into alignment with `schema.prisma` and existing code.

**What it does:**
- Adds missing fields to `clients` table (onboardingComplete, outboundPaused, aiDisabled, billing fields)
- Fixes OnboardingState relationship bug (customerId → clientId)
- Adds missing fields to `onboarding_states` table
- Creates BillingStatus enum
- Adds performance indexes

**Safety guarantees:**
- ✅ No data loss
- ✅ No downtime
- ✅ Idempotent (can be re-run safely)
- ✅ Uses safe defaults for all new fields
- ✅ Indexes created concurrently (no table locks)

---

## EXECUTION ORDER

### LOCAL DEVELOPMENT

```bash
# 1. Verify Prisma client is up to date
cd apps/backend
npm install

# 2. Format the migration (optional but recommended)
npx prisma format

# 3. Generate Prisma client with new schema
npx prisma generate

# 4. Run the migration (dry run first)
npx prisma migrate dev --name align_schema_with_production --skip-generate

# 5. Verify migration applied
npx prisma db pull
```

**Verify:**
```bash
# Check that new fields exist
psql $DATABASE_URL -c "\d clients"
psql $DATABASE_URL -c "\d onboarding_states"
```

---

### STAGING

```bash
# 1. Set staging DATABASE_URL in .env or export
export DATABASE_URL="postgresql://..."

# 2. Run migration (no dry-run needed if local passed)
npx prisma migrate deploy

# 3. Generate Prisma client
npx prisma generate

# 4. Restart backend service
# (method depends on your deployment: pm2, systemd, docker, etc.)

# 5. Verify application starts without Prisma errors
curl https://staging.yourapp.com/health
```

**Verify:**
```bash
# Check logs for Prisma client errors
tail -f /var/log/backend.log

# Verify fields exist
psql $DATABASE_URL -c "SELECT onboardingComplete, outboundPaused, aiDisabled FROM clients LIMIT 1;"
```

---

### PRODUCTION

**⚠️ PREREQUISITES:**
1. ✅ Migration tested successfully in local
2. ✅ Migration tested successfully in staging
3. ✅ Database backup created
4. ✅ Rollback plan ready (see below)
5. ✅ Code deployed but NOT restarted yet

**Execution:**

```bash
# 1. Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Set production DATABASE_URL
export DATABASE_URL="postgresql://production..."

# 3. Run migration
npx prisma migrate deploy

# Expected output:
# The following migration(s) have been applied:
#
# migrations/
#   └─ 20241223_align_schema_with_production/
#      └─ migration.sql

# 4. Generate Prisma client
npx prisma generate

# 5. Restart backend service
# (method depends on your deployment)
pm2 restart backend
# OR
systemctl restart backend
# OR
docker-compose restart backend

# 6. Monitor logs for errors
tail -f /var/log/backend.log | grep -i "prisma\|error"

# 7. Verify application health
curl https://api.yourapp.com/health

# 8. Smoke test key endpoints
curl https://api.yourapp.com/api/clients/YOUR_CLIENT_ID
```

**Verify:**
```bash
# Check that all new fields exist
psql $DATABASE_URL -c "\d clients"
psql $DATABASE_URL -c "\d onboarding_states"

# Verify data integrity (all new booleans should be FALSE)
psql $DATABASE_URL -c "SELECT COUNT(*) FROM clients WHERE onboardingComplete IS NULL;"
# Should return: 0

# Verify enum created
psql $DATABASE_URL -c "\dT BillingStatus"
```

---

## ROLLBACK PLAN

**If migration succeeds but application fails to start:**

```bash
# 1. Stop the application
pm2 stop backend

# 2. Revert code deployment (go back to previous commit)
git checkout <previous-commit-hash>
npm install
npm run build

# 3. Revert Prisma client
npx prisma generate

# 4. Restart application
pm2 start backend
```

**If migration fails or data corruption detected:**

```bash
# 1. Stop the application immediately
pm2 stop backend

# 2. Restore from backup
psql $DATABASE_URL < backup_TIMESTAMP.sql

# 3. Verify restoration
psql $DATABASE_URL -c "SELECT COUNT(*) FROM clients;"

# 4. Revert code and restart
git checkout <previous-commit-hash>
npm install && npm run build
npx prisma generate
pm2 start backend
```

---

## POST-MIGRATION VERIFICATION

Run these queries to verify migration success:

```sql
-- 1. Check Client table structure
SELECT column_name, data_type, is_nullable, column_default
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
);

-- 2. Check OnboardingState table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'onboarding_states'
AND column_name IN ('clientId', 'forwardingEnabled', 'testCallDetected');

-- 3. Verify BillingStatus enum exists
SELECT enumlabel FROM pg_enum
WHERE enumtypid = 'BillingStatus'::regtype
ORDER BY enumsortorder;

-- Expected output:
-- none
-- trial
-- active
-- canceled
-- past_due

-- 4. Verify all clients have safe defaults
SELECT
  COUNT(*) AS total_clients,
  SUM(CASE WHEN onboardingComplete = FALSE THEN 1 ELSE 0 END) AS onboarding_incomplete,
  SUM(CASE WHEN outboundPaused = FALSE THEN 1 ELSE 0 END) AS outbound_active,
  SUM(CASE WHEN aiDisabled = FALSE THEN 1 ELSE 0 END) AS ai_enabled,
  SUM(CASE WHEN billingStatus = 'none' THEN 1 ELSE 0 END) AS no_billing
FROM clients;

-- 5. Verify indexes created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('clients', 'onboarding_states')
AND indexname LIKE '%onboarding%' OR indexname LIKE '%outbound%' OR indexname LIKE '%ai%' OR indexname LIKE '%billing%';
```

---

## EXPECTED IMPACT

**During migration:**
- Duration: ~5-30 seconds (depends on table size)
- Downtime: **NONE** (all operations are non-blocking)
- Locks: **NONE** (indexes created concurrently)

**After migration:**
- Existing functionality: ✅ Unchanged
- New guard logic: ✅ Ready to activate
- Database size: Increases by ~1-2 MB (new columns + indexes)
- Query performance: ✅ Improved (new indexes on guard fields)

---

## TROUBLESHOOTING

### Error: "enum BillingStatus already exists"
**Cause:** Migration was partially run before.
**Fix:** This is SAFE. The migration is idempotent and will skip existing objects.

### Error: "column clients.onboardingComplete already exists"
**Cause:** Migration was partially run before.
**Fix:** This is SAFE. The migration will skip existing columns.

### Error: "Prisma client out of sync with schema"
**Cause:** Schema changed but client not regenerated.
**Fix:**
```bash
npx prisma generate
pm2 restart backend
```

### Error: "relation onboarding_states does not exist"
**Cause:** Migration not applied yet.
**Fix:** Run `npx prisma migrate deploy`

---

## NEXT STEPS

After migration completes successfully:

1. ✅ **Phase 1 Complete**: Schema aligned with production
2. ⏭️ **Phase 2**: Deploy SystemGate implementation
3. ⏭️ **Phase 3**: Deploy OnboardingGuard validation
4. ⏭️ **Phase 4**: Test guard logic in staging
5. ⏭️ **Phase 5**: Deploy to production

---

## QUESTIONS?

If you encounter issues not covered here:
1. Check Prisma logs: `tail -f /var/log/prisma.log`
2. Check database logs: `tail -f /var/log/postgresql.log`
3. Verify DATABASE_URL is correct
4. Ensure database user has ALTER TABLE permissions

**Emergency contact:** [Your team's on-call rotation]
