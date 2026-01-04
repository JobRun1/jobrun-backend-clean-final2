# ALERTING SYSTEM LOCKDOWN

**Status:** PRODUCTION-CRITICAL INFRASTRUCTURE — FROZEN
**Last Updated:** 2026-01-01
**Incident Reference:** Schema Drift Deduplication Failure

---

## Non-Negotiable Rules

The following components are **IMMUTABLE** and require production incident approval for any modifications:

### 1. AlertService.ts
**Location:** `apps/backend/src/services/AlertService.ts`

**Status:** READ-ONLY

**Allowed Changes:**
- Security patches (requires two-engineer approval)
- Incident fixes (requires postmortem documentation)

**Prohibited:**
- New alert types
- Logic refactors
- Feature additions
- Performance optimizations

### 2. alert_logs Table Schema
**Location:** Production PostgreSQL database

**Status:** SCHEMA FROZEN

**Allowed Changes:**
- NONE without production incident justification

**Current Schema (LOCKED):**
```sql
- id (TEXT, PRIMARY KEY)
- created_at (TIMESTAMP)
- alert_type (TEXT)
- alert_key (TEXT)
- severity (TEXT)
- resource_id (TEXT, nullable)
- delivered_at (TIMESTAMP)
- channel (TEXT)
- metadata (JSONB, nullable)
- acknowledged_at (TIMESTAMP, nullable)
- acknowledged_by (TEXT, nullable)
- resolution (TEXT, nullable)
```

### 3. Phase 5 Migration
**Location:** `apps/backend/prisma/migrations/20241226_phase_5_admin_control/migration.sql`

**Status:** ARCHIVED — Never re-run, never modify

### 4. Test Harness
**Location:** `apps/backend/scripts/test-ops-alerting.ts`

**Status:** Reference implementation — Changes require baseline update

---

## Schema Guard Protection

**Implementation:** Startup validation in AlertService.ts (lines 126-166)

**Behavior:**
- Validates alert_logs schema on every backend startup
- Performs READ-ONLY check via information_schema
- Crashes process if required columns missing
- No production data mutations

**Required Columns:**
- alert_type
- alert_key
- severity
- delivered_at
- acknowledged_at
- acknowledged_by
- resolution
- channel

**Success Log:**
```
✅ [ALERT_GUARD] alert_logs schema verified
```

**Failure Behavior:**
```
🚨 FATAL: alert_logs schema mismatch
Missing columns: [list]
Alerting cannot operate safely.
Startup aborted.
```

Process exits with code 1. Backend will not start.

---

## Enforcement Mechanisms

### Pre-Commit Hook (Recommended)
Warn on edits to frozen files:
- AlertService.ts
- test-ops-alerting.ts
- Any migration touching alert_logs

### CI/CD Gate
- Prisma schema changes to AlertLog model trigger schema guard validation
- Database migrations targeting alert_logs require manual approval

### Code Review Policy
Any PR touching alerting system requires:
1. Two-engineer approval
2. Incident justification OR security patch reference
3. Schema guard must pass in CI

---

## Verification Checklist

Before deploying changes to production:

- [ ] Schema guard passes on backend startup
- [ ] Run `test-ops-alerting.ts` twice back-to-back
- [ ] First run: ONE SMS received
- [ ] Second run: NO SMS, "Alert suppressed" message logged
- [ ] Production logs show: `✅ [ALERT_GUARD] alert_logs schema verified`

---

## Incident Prevention

**Root Cause of Original Incident:**
Prisma client schema included columns (`acknowledged_by`, `resolution`) that did not exist in production database. This caused all alert INSERT operations to fail silently, breaking deduplication because alerts were never logged to the database.

**Prevention Mechanisms Now in Place:**
1. Read-only schema guard validates column existence at startup
2. Fail-fast behavior (crash on mismatch) prevents silent failures
3. Lockdown policy prevents unauthorized schema changes
4. Documentation ensures team awareness

---

## Contact & Escalation

**For Schema Changes:**
Requires production incident with:
- Postmortem documentation
- Two-engineer approval
- Schema guard update (if adding columns)

**For Bug Fixes:**
Must demonstrate:
- Alert delivery is broken OR
- Deduplication is broken OR
- Security vulnerability exists

**For Feature Requests:**
Rejected. Alerting is complete. Use existing templates or wait for next architecture review.

---

## Next Phase

With alerting locked and operational, focus shifts to:
- **Stripe Integration** (payment failure alerting)
- **Billing State Machine** (revenue monitoring)
- **Webhook Handlers** (idempotent event processing)

Alerting is now boring infrastructure. It should remain invisible.

---

**Document Owner:** Engineering
**Review Cadence:** Quarterly (or on incident)
**Version:** 1.0
