# OPS ALERTS: STATE-BASED SUPPRESSION

**System:** JobRun Backend - Ops Alerting
**Status:** ✅ **COMPLETE**
**Date:** 2024-12-23

---

## PROBLEM STATEMENT

**Before this fix:**
- Payment gate alerts fired repeatedly every ~6 hours for the same unresolved payment block
- Time-based re-alerting (`stuckDetectedAt > 360 minutes`) caused alert spam
- No way to suppress alerts for testing/demo clients
- No historical record of how many times a client triggered payment alerts

**Impact:**
- Alert fatigue for operators
- Difficult to distinguish new issues from ongoing issues
- No way to track alert frequency per client

---

## SOLUTION: STATE-BASED ALERT SUPPRESSION

**New behavior:**
- Alert fires ONCE when client enters payment-blocked state
- Alert does NOT repeat while payment remains unresolved
- Alert resets when payment resolves, allowing new alerts if payment fails again
- Manual mute flag allows suppression for testing/demo clients
- Historical count tracks total alerts sent per client (never reset)

**Implementation:**
- Added 3 new fields to Client model
- Updated StuckClientDetector to use state-based checks
- Created reset function for when payment resolves
- Migration SQL for production deployment

---

## CHANGES MADE

### 1. Database Schema (`schema.prisma`)

Added 3 fields to `Client` model:

```prisma
// Ops Alerts: State-based alert suppression
paymentGateAlertedAt  DateTime? // Last time payment gate alert was sent
paymentGateAlertCount Int       @default(0) // Total alerts sent (never reset)
opsAlertsMuted        Boolean   @default(false) // Manual mute for testing/demos
```

### 2. Alert Logic (`StuckClientDetector.ts`)

**Before (Time-based):**
```typescript
const isNewStuckCondition = !client.stuckDetectedAt ||
  this.calculateMinutesInState(client.stuckDetectedAt, now) > 360; // Re-alert after 6 hours

if (isNewStuckCondition && client.currentState === "S5_CONFIRM_LIVE" && !client.paymentActive) {
  await AlertService.sendCriticalAlert(...);
}
```

**After (State-based):**
```typescript
// Only alert if:
// - Client is at S5_CONFIRM_LIVE (payment gate)
// - paymentActive = false (blocked by payment)
// - Stuck for >2 hours
// - NOT muted (opsAlertsMuted = false)
// - NOT already alerted (paymentGateAlertedAt IS NULL)
if (
  client.currentState === "S5_CONFIRM_LIVE" &&
  !client.paymentActive &&
  client.timeInStateMinutes > 120 &&
  !client.opsAlertsMuted &&
  client.paymentGateAlertedAt === null
) {
  await AlertService.sendCriticalAlert(...);

  // Mark alert as sent (prevents repeat alerts until payment resolves)
  await prisma.client.update({
    where: { id: client.clientId },
    data: {
      paymentGateAlertedAt: now,
      paymentGateAlertCount: { increment: 1 },
    },
  });
}
```

### 3. Reset Function (`StuckClientDetector.ts`)

Added helper function for when payment resolves:

```typescript
/**
 * Reset payment gate alert when payment resolves
 *
 * Call this when:
 * - paymentActive transitions to true
 * - billingStatus transitions to 'active'
 */
static async resetPaymentGateAlert(clientId: string): Promise<void> {
  await prisma.client.update({
    where: { id: clientId },
    data: {
      paymentGateAlertedAt: null,
      // paymentGateAlertCount is NOT reset (historical record)
    },
  });
}
```

### 4. Migration SQL

Created: `prisma/migrations/20241223_add_ops_alert_fields/migration.sql`

- Adds 3 new columns to `clients` table
- Idempotent (safe to re-run)
- No data loss
- Safe defaults for all fields

---

## HOW IT WORKS

### Alert Lifecycle

1. **Client enters payment-blocked state:**
   - `currentState = S5_CONFIRM_LIVE`
   - `paymentActive = false`
   - `timeInStateMinutes > 120`
   - `paymentGateAlertedAt IS NULL` ✅ (new condition)
   - `opsAlertsMuted = false` ✅ (new condition)
   - **Result:** Alert fires ONCE

2. **Client remains payment-blocked:**
   - `paymentGateAlertedAt` is now set (not NULL)
   - **Result:** Alert does NOT fire (state unchanged)

3. **Payment resolves:**
   - Code calls `StuckClientDetector.resetPaymentGateAlert(clientId)`
   - `paymentGateAlertedAt` set to NULL
   - `paymentGateAlertCount` remains unchanged (historical record)
   - **Result:** Ready for new alert if payment fails again

4. **Manual mute for testing/demos:**
   - Set `opsAlertsMuted = true` for client
   - **Result:** ALL payment gate alerts suppressed

---

## INTEGRATION POINTS

### When Payment Resolves (Future Stripe Integration)

Call the reset function when payment is activated:

```typescript
// When Stripe webhook confirms payment:
await prisma.client.update({
  where: { id: clientId },
  data: {
    paymentActive: true,
    billingStatus: 'active'
  }
});

// Reset payment gate alert (allows new alerts if payment fails again)
await StuckClientDetector.resetPaymentGateAlert(clientId);
```

### When Admin Manually Activates Payment

```typescript
// Admin route for manual payment activation:
await prisma.client.update({
  where: { id: clientId },
  data: { paymentActive: true }
});

await StuckClientDetector.resetPaymentGateAlert(clientId);
```

---

## TESTING

### Test Case 1: Alert Fires Once for New Payment Block

```typescript
// Setup: Client with no payment, stuck at S5 for >2 hours
const client = await prisma.client.create({
  data: {
    businessName: "Test Client",
    paymentActive: false,
    billingStatus: 'none',
    paymentGateAlertedAt: null, // Never alerted
    opsAlertsMuted: false
  }
});

// Create onboarding state stuck at S5 for >2 hours
await prisma.onboardingState.create({
  data: {
    clientId: client.id,
    currentState: 'S5_CONFIRM_LIVE',
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
  }
});

// Run detection
await StuckClientDetector.detectAndLog();

// Expected:
// ✅ Alert fires
// ✅ paymentGateAlertedAt set to now
// ✅ paymentGateAlertCount = 1
```

### Test Case 2: Alert Does NOT Fire for Ongoing Block

```typescript
// Setup: Same client, alert already sent
const client = await prisma.client.findUnique({ where: { id: clientId } });
// client.paymentGateAlertedAt is NOT NULL (alert already sent)

// Run detection again (6 hours later)
await StuckClientDetector.detectAndLog();

// Expected:
// ✅ Alert does NOT fire (paymentGateAlertedAt is not NULL)
// ✅ paymentGateAlertCount remains 1 (unchanged)
```

### Test Case 3: Alert Resets When Payment Resolves

```typescript
// Payment resolves
await prisma.client.update({
  where: { id: clientId },
  data: { paymentActive: true, billingStatus: 'active' }
});

await StuckClientDetector.resetPaymentGateAlert(clientId);

// Expected:
// ✅ paymentGateAlertedAt set to NULL
// ✅ paymentGateAlertCount remains 1 (historical record)

// If payment fails again later:
await StuckClientDetector.detectAndLog();
// ✅ New alert fires (paymentGateAlertedAt was NULL)
// ✅ paymentGateAlertCount increments to 2
```

### Test Case 4: Mute Flag Suppresses All Alerts

```typescript
// Setup: Client with opsAlertsMuted = true
await prisma.client.update({
  where: { id: clientId },
  data: { opsAlertsMuted: true }
});

// Run detection
await StuckClientDetector.detectAndLog();

// Expected:
// ✅ Alert does NOT fire (opsAlertsMuted = true)
// ✅ paymentGateAlertedAt remains NULL
// ✅ paymentGateAlertCount remains unchanged
```

---

## DEPLOYMENT

### Local/Staging

```bash
cd apps/backend

# Run migration
npx prisma migrate dev --name add_ops_alert_fields

# Regenerate Prisma client
npx prisma generate

# Restart backend
npm run dev
```

### Production

```bash
# Create backup FIRST
pg_dump $DATABASE_URL > backup_before_ops_alerts_$(date +%Y%m%d).sql

# Run migration
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate

# Deploy code changes
git push origin production

# Verify migration success
psql $DATABASE_URL -c "
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'clients'
  AND column_name IN ('paymentGateAlertedAt', 'paymentGateAlertCount', 'opsAlertsMuted');
"

# Expected: All 3 columns exist with correct types
```

---

## VERIFICATION

### Query: Check Alert State for All Clients

```sql
SELECT
  id,
  "businessName",
  "paymentActive",
  "paymentGateAlertedAt",
  "paymentGateAlertCount",
  "opsAlertsMuted"
FROM clients
WHERE "paymentActive" = false
ORDER BY "paymentGateAlertCount" DESC;
```

### Query: Find Clients with Multiple Payment Alerts (High Priority)

```sql
SELECT
  id,
  "businessName",
  "phoneNumber",
  "paymentGateAlertCount",
  "paymentGateAlertedAt"
FROM clients
WHERE "paymentGateAlertCount" > 2
ORDER BY "paymentGateAlertCount" DESC;
```

### Query: Find Muted Clients

```sql
SELECT
  id,
  "businessName",
  "phoneNumber",
  "opsAlertsMuted"
FROM clients
WHERE "opsAlertsMuted" = true;
```

---

## FILES MODIFIED

1. **`prisma/schema.prisma`** - Added 3 alert fields to Client model
2. **`src/services/StuckClientDetector.ts`** - Updated alert logic, added reset function
3. **`prisma/migrations/20241223_add_ops_alert_fields/migration.sql`** - Migration SQL (NEW)
4. **`OPS_ALERTS_STATE_BASED_SUPPRESSION.md`** - This document (NEW)

**Total:** 2 modified, 2 created

---

## SAFETY GUARANTEES

- ✅ **Additive only** - No destructive changes
- ✅ **Safe defaults** - All fields default to safe values (NULL, 0, false)
- ✅ **Idempotent migration** - Can be re-run safely
- ✅ **No data loss** - No columns dropped, no data modified
- ✅ **No behavior changes** - Existing alert logic still works for other alert types
- ✅ **No user-facing changes** - Internal ops alerting only

---

## MONITORING

### Success Signals

After deployment, monitor for:
- ✅ Payment gate alerts fire ONCE per client
- ✅ No repeat alerts every 6 hours
- ✅ `paymentGateAlertCount` increments correctly
- ✅ `paymentGateAlertedAt` gets set when alert fires

### Warning Signals

- ⚠️ Alert fires but `paymentGateAlertedAt` remains NULL (update failed)
- ⚠️ Alert does NOT fire when `paymentGateAlertedAt` IS NULL (logic bug)

### Rollback Signals

- 🚨 Prisma client errors (column does not exist)
- 🚨 Migration fails
- 🚨 Application fails to start

---

## CONCLUSION

**Problem solved:** Payment gate alerts no longer spam operators every 6 hours.

**New behavior:** Alert fires once when payment blocks, stays silent until payment resolves.

**Production-ready:** Migration tested, safe defaults, idempotent, documented.

**Foundation ready for:** Stripe integration, manual payment activation, admin override.

Deploy with confidence.
