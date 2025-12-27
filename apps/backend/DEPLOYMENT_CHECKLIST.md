# PRODUCTION DEPLOYMENT CHECKLIST

**CRITICAL**: This checklist must be followed in exact order. Skipping steps or changing order will cause production failures.

---

## PRE-DEPLOYMENT VERIFICATION

### [ ] 1. Code Review Complete
- [ ] All changes reviewed and approved
- [ ] Migration SQL audited for safety
- [ ] No destructive operations in migration
- [ ] Backfill logic verified

### [ ] 2. Backup Plan Ready
- [ ] Database backup procedure documented
- [ ] Rollback SQL prepared
- [ ] Previous code version tagged in git
- [ ] Rollback procedure tested in staging

### [ ] 3. Testing Complete
- [ ] Migration tested in local environment
- [ ] Migration tested in staging environment
- [ ] Code tested in staging environment
- [ ] SystemGate guards tested
- [ ] OnboardingGuard validation tested

---

## LOCAL ENVIRONMENT (FIRST)

### [ ] 4. Local Database Migration

```bash
# Set local DATABASE_URL
export DATABASE_URL="postgresql://localhost:5432/jobrun_dev"

# Verify connection
psql $DATABASE_URL -c "SELECT version();"

# ⚠️ DO NOT PROCEED if connection fails
```

**DO NOT PROCEED IF:** Database connection fails, wrong database selected

```bash
# Run migration
cd apps/backend
npx prisma migrate dev --name align_schema_with_production

# Expected output:
# - "Migration applied successfully"
# - No errors
# - Backfill rows updated count

# ⚠️ DO NOT PROCEED if migration fails
```

**DO NOT PROCEED IF:** Migration fails, errors in output, backfill count unexpected

### [ ] 5. Local Prisma Client Regeneration

```bash
# Generate Prisma client with new schema
npx prisma generate

# Expected output:
# - "Generated Prisma Client"
# - No errors

# ⚠️ DO NOT PROCEED if generation fails
```

**DO NOT PROCEED IF:** Prisma client generation fails, type errors appear

### [ ] 6. Local Verification

```sql
-- Verify new columns exist
psql $DATABASE_URL -c "\d clients" | grep -E "onboardingComplete|outboundPaused|aiDisabled"

-- Expected: All three columns listed

-- Verify onboarding_states.clientId backfilled
psql $DATABASE_URL -c "
  SELECT
    COUNT(*) AS total_rows,
    COUNT(\"clientId\") AS rows_with_clientId,
    COUNT(\"customer_id\") AS rows_with_customer_id
  FROM onboarding_states;
"

-- Expected: rows_with_clientId = rows_with_customer_id (all backfilled)

-- Verify BillingStatus enum exists
psql $DATABASE_URL -c "\dT BillingStatus"

-- Expected: Enum values: none, trial, active, canceled, past_due
```

**DO NOT PROCEED IF:** Columns missing, backfill incomplete, enum not created

### [ ] 7. Local Application Start

```bash
# Start backend
npm run dev

# Monitor logs for errors
tail -f logs/backend.log | grep -i "prisma\|error"

# Expected:
# - No Prisma client errors
# - No "column does not exist" errors
# - Application starts successfully
```

**DO NOT PROCEED IF:** Application fails to start, Prisma errors in logs

### [ ] 8. Local Smoke Tests

```bash
# Test health endpoint
curl http://localhost:3000/health

# Expected: 200 OK

# Test SystemGate logging
# (trigger an inbound SMS in local, check logs)
tail -f logs/backend.log | grep SystemGate

# Expected: SystemGate logs appear
```

**DO NOT PROCEED IF:** Health check fails, SystemGate not logging

---

## STAGING ENVIRONMENT (SECOND)

### [ ] 9. Staging Database Backup

```bash
# Set staging DATABASE_URL
export DATABASE_URL="postgresql://staging.example.com:5432/jobrun_staging"

# Create backup (⚠️ REQUIRED before migration)
pg_dump $DATABASE_URL > backup_staging_$(date +%Y%m%d_%H%M%S).sql

# Verify backup created
ls -lh backup_staging_*.sql

# Expected: Backup file exists, non-zero size
```

**DO NOT PROCEED IF:** Backup fails, file is empty

### [ ] 10. Staging Database Migration

```bash
# Run migration
cd apps/backend
npx prisma migrate deploy

# Expected output:
# - "Migration applied successfully"
# - Backfill rows updated count matches expected
# - No errors

# ⚠️ STOP AND ROLLBACK if migration fails
```

**ROLLBACK IF:** Migration fails, backfill count unexpected, errors appear

**Rollback procedure:**
```bash
# Stop backend
pm2 stop backend

# Restore from backup
psql $DATABASE_URL < backup_staging_TIMESTAMP.sql

# Verify restoration
psql $DATABASE_URL -c "SELECT COUNT(*) FROM clients;"
```

### [ ] 11. Staging Prisma Client Regeneration

```bash
# Generate Prisma client
npx prisma generate

# Expected: "Generated Prisma Client", no errors
```

**DO NOT PROCEED IF:** Generation fails

### [ ] 12. Staging Code Deployment

```bash
# Deploy code changes (method depends on your CI/CD)
git push origin main
# OR
./deploy-staging.sh

# Wait for deployment to complete
```

**DO NOT PROCEED IF:** Deployment fails, build errors

### [ ] 13. Staging Application Restart

```bash
# Restart backend service
pm2 restart backend
# OR
systemctl restart backend
# OR
kubectl rollout restart deployment/backend

# Monitor startup logs
tail -f /var/log/backend.log | grep -i "error\|ready"

# Expected:
# - "Server ready" or similar
# - No Prisma errors
# - No "column does not exist" errors
```

**ROLLBACK IF:** Application fails to start, Prisma errors appear

**Rollback procedure:**
```bash
# Stop new code
pm2 stop backend

# Revert code deployment
git revert HEAD
git push origin main

# Restore database
psql $DATABASE_URL < backup_staging_TIMESTAMP.sql

# Restart with old code
pm2 start backend
```

### [ ] 14. Staging Verification Queries

```sql
-- Verify schema alignment
psql $DATABASE_URL -c "
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'clients'
  AND column_name IN (
    'onboardingComplete',
    'outboundPaused',
    'aiDisabled',
    'billingStatus'
  );
"

-- Expected: All 4 columns exist with correct types

-- Verify backfill success
psql $DATABASE_URL -c "
  SELECT
    COUNT(*) AS total,
    COUNT(\"clientId\") AS with_clientId,
    COUNT(NULLIF(\"clientId\", '')) AS non_empty_clientId
  FROM onboarding_states;
"

-- Expected: with_clientId = total (all backfilled)

-- Verify FK constraint exists
psql $DATABASE_URL -c "
  SELECT constraint_name, table_name
  FROM information_schema.table_constraints
  WHERE constraint_name = 'onboarding_states_clientId_fkey';
"

-- Expected: Constraint exists
```

**DO NOT PROCEED IF:** Any verification fails

### [ ] 15. Staging Functional Tests

```bash
# Test SystemGate guards
# 1. Create incomplete client
# 2. Send inbound SMS
# 3. Verify SOFT BLOCK logged

# Test OnboardingGuard validation
# 1. Attempt to complete onboarding without requirements
# 2. Verify validation fails

# Test kill switches
# 1. Set outboundPaused = true
# 2. Send inbound SMS
# 3. Verify no outbound SMS sent (HARD BLOCK)

# Test AI disabled
# 1. Set aiDisabled = true
# 2. Send inbound SMS
# 3. Verify deterministic fallback used
```

**DO NOT PROCEED IF:** Any functional test fails

### [ ] 16. Staging Soak Test (24-48 hours)

Monitor staging for 24-48 hours:
- [ ] No Prisma errors
- [ ] No SystemGate failures
- [ ] No OnboardingGuard failures
- [ ] No performance degradation
- [ ] Logs clean

**DO NOT PROCEED TO PRODUCTION IF:** Any issues found

---

## PRODUCTION ENVIRONMENT (FINAL)

### [ ] 17. Production Pre-Flight Checks

- [ ] Staging running stable for 24-48 hours
- [ ] All tests passing in staging
- [ ] Rollback plan reviewed and ready
- [ ] Oncall engineer alerted
- [ ] Maintenance window scheduled (if needed)
- [ ] Stakeholders notified

### [ ] 18. Production Database Backup (CRITICAL)

```bash
# Set production DATABASE_URL
export DATABASE_URL="postgresql://production.example.com:5432/jobrun_prod"

# ⚠️ CRITICAL: Create backup BEFORE any changes
pg_dump $DATABASE_URL > backup_production_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_production_*.sql

# Test restore (optional but recommended)
# psql test_db < backup_production_TIMESTAMP.sql
```

**⚠️ STOP DEPLOYMENT IF:** Backup fails, cannot verify backup

### [ ] 19. Production Database Migration

```bash
# Run migration
cd apps/backend
npx prisma migrate deploy

# Monitor output carefully
# Expected:
# - "Migration applied successfully"
# - Backfill count matches expected (based on staging)
# - No errors
# - No warnings (except expected ones)

# ⚠️ IMMEDIATELY ROLLBACK if migration fails
```

**IMMEDIATE ROLLBACK IF:**
- Migration fails
- Backfill count unexpected
- Any errors appear
- Warnings about orphaned data (investigate first)

**Rollback procedure:**
```bash
# IMMEDIATELY restore from backup
psql $DATABASE_URL < backup_production_TIMESTAMP.sql

# Verify restoration
psql $DATABASE_URL -c "SELECT COUNT(*) FROM clients;"

# Notify team: "Migration failed, rolled back to backup"
```

### [ ] 20. Production Prisma Client Regeneration

```bash
# Generate Prisma client
npx prisma generate

# Expected: "Generated Prisma Client", no errors
```

**DO NOT PROCEED IF:** Generation fails

### [ ] 21. Production Code Deployment

```bash
# Deploy code changes (method depends on your CI/CD)
git push origin production
# OR
./deploy-production.sh

# Wait for deployment to complete
# Monitor deployment logs
```

**DO NOT PROCEED IF:** Deployment fails

### [ ] 22. Production Application Restart

```bash
# Restart backend service (zero-downtime if possible)
pm2 reload backend
# OR
kubectl rollout restart deployment/backend

# Monitor startup logs CLOSELY
tail -f /var/log/backend.log | grep -i "error\|ready"

# Expected:
# - "Server ready"
# - No Prisma errors
# - No "column does not exist" errors
```

**IMMEDIATE ROLLBACK IF:**
- Application fails to start
- Prisma errors in logs
- "Column does not exist" errors
- Any critical errors

**Rollback procedure:**
```bash
# Stop new code
pm2 stop backend

# Restore database
psql $DATABASE_URL < backup_production_TIMESTAMP.sql

# Revert code
git revert HEAD
git push origin production
# OR
./deploy-production.sh --rollback

# Restart with old code
pm2 start backend

# Verify application healthy
curl https://api.yourapp.com/health
```

### [ ] 23. Production Verification Queries

```sql
-- Verify all new columns exist
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

-- Expected: All 8 columns exist

-- Verify backfill success (CRITICAL)
SELECT
  COUNT(*) AS total_onboarding_states,
  COUNT("clientId") AS backfilled_count,
  COUNT("customer_id") AS legacy_count
FROM onboarding_states;

-- Expected: backfilled_count = legacy_count (all rows backfilled)

-- Verify constraints exist
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE constraint_name IN (
  'onboarding_states_clientId_fkey',
  'onboarding_states_clientId_key'
);

-- Expected: Both constraints exist

-- Verify indexes created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('clients', 'onboarding_states')
AND indexname LIKE '%onboarding%' OR indexname LIKE '%outbound%' OR indexname LIKE '%ai%';

-- Expected: All guard field indexes exist
```

**IMMEDIATE ROLLBACK IF:** Any verification fails

### [ ] 24. Production Health Check

```bash
# Health endpoint
curl https://api.yourapp.com/health

# Expected: 200 OK

# Monitor error rate
# (method depends on your monitoring setup)
# Datadog: check error rate dashboard
# Sentry: check error count
# CloudWatch: check error metrics

# Expected: No spike in errors
```

**IMMEDIATE ROLLBACK IF:** Health check fails, error rate spikes

### [ ] 25. Production Smoke Tests

```bash
# Test real user flow
# 1. Onboarding SMS flow (if safe in production)
# 2. Inbound customer SMS
# 3. SystemGate guards working

# Monitor logs
tail -f /var/log/backend.log | grep -E "SystemGate|OnboardingGuard"

# Expected: Guard logs appearing, no errors
```

**IMMEDIATE ROLLBACK IF:** User flows broken, guards failing

### [ ] 26. Production Monitoring (First 2 Hours)

Monitor closely for first 2 hours:
- [ ] Error rate normal
- [ ] Response time normal
- [ ] CPU/memory normal
- [ ] Database query performance normal
- [ ] SystemGate logs clean
- [ ] OnboardingGuard logs clean
- [ ] No Prisma errors
- [ ] No user complaints

**Initiate rollback if:** Any metric abnormal, user complaints, errors spiking

---

## POST-DEPLOYMENT

### [ ] 27. Extended Monitoring (24 Hours)

Continue monitoring for 24 hours:
- [ ] Error rate stable
- [ ] No data inconsistencies
- [ ] SystemGate functioning correctly
- [ ] OnboardingGuard validation working
- [ ] Kill switches functional
- [ ] No performance degradation

### [ ] 28. Cleanup

- [ ] Staging backup can be archived (after 7 days)
- [ ] Production backup must be retained (permanent)
- [ ] Update runbooks with new schema
- [ ] Document any issues encountered
- [ ] Share deployment report with team

---

## EMERGENCY ROLLBACK PROCEDURE

**If critical issue found at any point:**

### Immediate Actions:

```bash
# 1. STOP BACKEND IMMEDIATELY
pm2 stop backend
# OR kubectl scale deployment/backend --replicas=0

# 2. RESTORE DATABASE FROM BACKUP
psql $DATABASE_URL < backup_production_TIMESTAMP.sql

# Verify restoration:
psql $DATABASE_URL -c "SELECT COUNT(*) FROM clients;"
psql $DATABASE_URL -c "\d clients" | grep -v onboardingComplete

# Expected: Old schema restored, row count matches

# 3. REVERT CODE DEPLOYMENT
git revert HEAD
git push origin production
# Deploy reverted code

# 4. RESTART BACKEND WITH OLD CODE
pm2 start backend

# 5. VERIFY APPLICATION HEALTHY
curl https://api.yourapp.com/health

# 6. NOTIFY TEAM
# "Production rollback complete. System stable on previous version."
```

### Post-Rollback:

1. Investigate root cause
2. Fix issue in code/migration
3. Re-test in staging
4. Schedule new deployment

---

## CRITICAL REMINDERS

### ⚠️ DATABASE BEFORE CODE

**ALWAYS:**
1. Run database migration FIRST
2. Verify migration success
3. THEN deploy code

**NEVER:**
1. Deploy code before migration
2. Skip verification steps
3. Assume "it worked in staging"

### ⚠️ BACKUP BEFORE EVERYTHING

**ALWAYS:**
- Create backup before migration
- Verify backup file exists and is non-zero size
- Test backup restore (in staging)

**NEVER:**
- Run migration without backup
- Assume backup will work
- Delete backup before 30 days

### ⚠️ ROLLBACK TRIGGERS

**Immediate rollback if:**
- Migration fails
- Prisma client errors
- "Column does not exist" errors
- Application fails to start
- Error rate spikes >10%
- User-facing bugs reported
- Database query performance degraded >20%

**Do NOT:**
- Try to "fix forward" in production
- Apply manual SQL patches
- Restart repeatedly hoping it fixes itself

---

## SIGN-OFF

**Deployment completed by:** _________________
**Date:** _________________
**Environment:** ☐ Local  ☐ Staging  ☐ Production
**Result:** ☐ Success  ☐ Rolled Back
**Issues encountered:** _________________
**Notes:** _________________
