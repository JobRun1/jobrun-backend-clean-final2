# TWILIO NUMBER POOL + PAYMENT GATE TEST PLAN

## Setup Instructions

### 1. Run Migrations
```bash
cd apps/backend
npx prisma migrate dev
```

### 2. Seed Number Pool
```bash
# Add 10 test numbers to pool
TWILIO_POOL_NUMBERS="+447111111111,+447111111112,+447111111113,+447111111114,+447111111115,+447111111116,+447111111117,+447111111118,+447111111119,+447111111110" \
npx ts-node scripts/seed-twilio-pool.ts
```

Verify pool state:
```sql
SELECT phone_e164, status, client_id FROM twilio_number_pool;
```

Expected: 10 rows with status='AVAILABLE', client_id=NULL

---

## Test Scenario 1: Payment Inactive (No Allocation)

**Goal:** Verify payment gate blocks progression and requests payment

### Steps:
1. Create test client with paymentActive=false:
```sql
INSERT INTO clients (id, "businessName", region, "phoneNumber", "paymentActive", "twilioNumber")
VALUES ('test-client-1', 'Test Business', 'UK', '447900000001', false, NULL);
```

2. Start onboarding via SMS webhook (simulate):
   - FROM: +447900000001
   - TO: +447476955179 (global onboarding number)
   - BODY: "Plumber from London"

3. Progress through states:
   - S1: Reply "Plumber from London" → Advance to S2
   - S2: Reply "ABC Plumbing" → Advance to S3
   - S3: Reply "John Smith" → Advance to S4
   - S4: Reply "SMS" → Advance to S5
   - S5: Reply "YES" → **BLOCKED BY PAYMENT GATE**

### Expected Logs:
```
💳 [PAYMENT_GATE] Checking payment status before phone type selection
❌ [PAYMENT_GATE] Payment not active - blocking progression
💳 [PAYMENT_GATE] Sending payment message
PAYMENT_REQUIRED { clientId: 'test-client-1', ownerPhone: '447900000001', timestamp: '...' }
⚠️  [ONBOARDING] BLOCKED BY PAYMENT GATE
```

### Expected SMS Response:
```
Perfect! One last step before we go live.

JobRun costs £29/month (cancel anytime).

To activate, confirm payment here:
https://buy.stripe.com/test_XXXXX (placeholder)

Reply READY once you've confirmed.
```

### Expected DB State:
```sql
-- Client should NOT have twilioNumber assigned
SELECT id, "twilioNumber", "paymentActive" FROM clients WHERE id = 'test-client-1';
-- Result: twilioNumber = NULL, paymentActive = false

-- OnboardingState should still be at S5_CONFIRM_LIVE
SELECT "clientId", "currentState" FROM onboarding_states WHERE "client_id" = 'test-client-1';
-- Result: currentState = 'S5_CONFIRM_LIVE'

-- Pool should still have 10 available numbers
SELECT COUNT(*) FROM twilio_number_pool WHERE status = 'AVAILABLE';
-- Result: 10
```

---

## Test Scenario 2: Payment Active (Successful Allocation)

**Goal:** Verify payment gate passes and number is allocated atomically

### Steps:
1. Activate payment for test client:
```sql
UPDATE clients SET "paymentActive" = true WHERE id = 'test-client-1';
```

2. Continue onboarding:
   - S5: Reply "READY" (or "YES" again) → **PAYMENT GATE PASSES**
   - System allocates number from pool
   - Advance to S6_PHONE_TYPE

3. Complete onboarding:
   - S6: Reply "1" (iPhone) → Advance to S7_FWD_SENT
   - S7: Reply "DONE" → Advance to S8_FWD_CONFIRM
   - Simulate test call → S9_TEST_CALL
   - Complete → COMPLETE

### Expected Logs (Payment Gate):
```
💳 [PAYMENT_GATE] Checking payment status before phone type selection
✅ [PAYMENT_GATE] Payment active - allocating Twilio number
📞 [POOL] Allocating Twilio number
   Client ID: test-client-1
📞 [POOL] Selected number: +447111111111
✅ [POOL] Number assigned successfully
   Client: test-client-1
   Number: +447111111111
POOL_ALLOCATION_SUCCESS { clientId: 'test-client-1', phoneE164: '+447111111111', timestamp: '...' }
✅ [PAYMENT_GATE] Number allocated: +447111111111
NUMBER_ALLOCATED { clientId: 'test-client-1', phoneE164: '+447111111111', ownerPhone: '447900000001', timestamp: '...' }
```

### Expected Logs (Forwarding Instructions):
```
📲 [ONBOARDING] Sending forwarding instructions
   Client Twilio Number: +447111111111
✅ [ONBOARDING] HANDLER COMPLETE
```

### Expected SMS Response at S6→S7:
```
📱 iPhone Setup (30 seconds)

1. Open Phone app
2. Tap your profile (top right)
3. Scroll to "Call Forwarding"
4. Enable "When Busy or Unanswered"
5. Enter this number:
   +447111111111

Done? Reply DONE
```

### Expected DB State:
```sql
-- Client should have twilioNumber assigned
SELECT id, "twilioNumber", "paymentActive" FROM clients WHERE id = 'test-client-1';
-- Result: twilioNumber = '+447111111111', paymentActive = true

-- Pool should have 1 ASSIGNED, 9 AVAILABLE
SELECT status, COUNT(*) FROM twilio_number_pool GROUP BY status;
-- Result: ASSIGNED=1, AVAILABLE=9

-- Pool record should be linked to client
SELECT "phoneE164", status, "client_id" FROM twilio_number_pool WHERE status = 'ASSIGNED';
-- Result: phoneE164 = '+447111111111', status = 'ASSIGNED', client_id = 'test-client-1'

-- OnboardingState should be at S6_PHONE_TYPE or beyond
SELECT "clientId", "currentState" FROM onboarding_states WHERE "client_id" = 'test-client-1';
-- Result: currentState = 'S6_PHONE_TYPE' (or later)
```

---

## Test Scenario 3: Pool Empty

**Goal:** Verify graceful handling when no numbers available

### Steps:
1. Mark all pool numbers as ASSIGNED:
```sql
UPDATE twilio_number_pool SET status = 'ASSIGNED', "client_id" = 'dummy-client', "assigned_at" = NOW();
```

2. Create new test client with paymentActive=true:
```sql
INSERT INTO clients (id, "businessName", region, "phoneNumber", "paymentActive", "twilioNumber")
VALUES ('test-client-2', 'Test Business 2', 'UK', '447900000002', true, NULL);
```

3. Progress through onboarding to S5:
   - S1 → S2 → S3 → S4 → S5
   - S5: Reply "YES" → **POOL EMPTY**

### Expected Logs:
```
💳 [PAYMENT_GATE] Checking payment status before phone type selection
✅ [PAYMENT_GATE] Payment active - allocating Twilio number
📞 [POOL] Allocating Twilio number
   Client ID: test-client-2
❌ [POOL] POOL_EMPTY - No available numbers
POOL_EMPTY { clientId: 'test-client-2', timestamp: '...' }
❌ [PAYMENT_GATE] Number allocation failed: POOL_EMPTY
POOL_EMPTY_DURING_ONBOARDING { clientId: 'test-client-2', ownerPhone: '447900000002', timestamp: '...' }
⚠️  [ONBOARDING] BLOCKED BY ALLOCATION FAILURE
```

### Expected SMS Response:
```
We're currently at capacity.

Your payment is confirmed, and you're on our priority list.

We'll text you within 24 hours when your JobRun number is ready.
```

### Expected DB State:
```sql
-- Client should NOT have twilioNumber
SELECT id, "twilioNumber", "paymentActive" FROM clients WHERE id = 'test-client-2';
-- Result: twilioNumber = NULL, paymentActive = true

-- OnboardingState should still be at S5_CONFIRM_LIVE
SELECT "clientId", "currentState" FROM onboarding_states WHERE "client_id" = 'test-client-2';
-- Result: currentState = 'S5_CONFIRM_LIVE'

-- Pool should have 0 available
SELECT COUNT(*) FROM twilio_number_pool WHERE status = 'AVAILABLE';
-- Result: 0
```

---

## Test Scenario 4: Idempotency (Retry After Allocation)

**Goal:** Verify allocation is idempotent (doesn't allocate twice)

### Steps:
1. Reset pool (make numbers available again):
```sql
UPDATE twilio_number_pool SET status = 'AVAILABLE', "client_id" = NULL, "assigned_at" = NULL;
```

2. Use test-client-1 (already has number from Scenario 2):
```sql
SELECT id, "twilioNumber" FROM clients WHERE id = 'test-client-1';
-- Should show: twilioNumber = '+447111111111'
```

3. Manually trigger allocation again:
```typescript
// In Node console or test script
const { allocateTwilioNumber } = require('./src/services/TwilioNumberPoolService');
await allocateTwilioNumber('test-client-1');
```

### Expected Logs:
```
📞 [POOL] Allocating Twilio number
   Client ID: test-client-1
✅ [POOL] Client already has number (idempotent): +447111111111
```

### Expected Result:
```javascript
{
  success: true,
  phoneE164: '+447111111111',
  reason: 'ALREADY_ASSIGNED',
  clientId: 'test-client-1'
}
```

### Expected DB State:
```sql
-- Client should STILL have same number
SELECT id, "twilioNumber" FROM clients WHERE id = 'test-client-1';
-- Result: twilioNumber = '+447111111111'

-- Pool should NOT have duplicate assignments
SELECT COUNT(*) FROM twilio_number_pool WHERE "client_id" = 'test-client-1';
-- Result: 1
```

---

## Test Scenario 5: Concurrent Allocation (Race Condition Test)

**Goal:** Verify FOR UPDATE SKIP LOCKED prevents race conditions

### Steps:
1. Reset pool:
```sql
UPDATE twilio_number_pool SET status = 'AVAILABLE', "client_id" = NULL, "assigned_at" = NULL;
```

2. Create 3 test clients:
```sql
INSERT INTO clients (id, "businessName", region, "phoneNumber", "paymentActive")
VALUES
  ('race-client-1', 'Race Test 1', 'UK', '447900000101', true),
  ('race-client-2', 'Race Test 2', 'UK', '447900000102', true),
  ('race-client-3', 'Race Test 3', 'UK', '447900000103', true);
```

3. Run allocations concurrently (in parallel):
```typescript
// Test script
const clients = ['race-client-1', 'race-client-2', 'race-client-3'];
const results = await Promise.all(
  clients.map(clientId => allocateTwilioNumber(clientId))
);

console.log('Results:', results);
```

### Expected Results:
- All 3 allocations succeed
- Each client gets a DIFFERENT number
- No duplicate assignments
- Pool shows 3 ASSIGNED, 7 AVAILABLE

### Expected DB State:
```sql
-- Each client has unique number
SELECT id, "twilioNumber" FROM clients WHERE id LIKE 'race-client-%' ORDER BY id;
-- Result: 3 rows, all with different twilioNumbers

-- Pool has 3 assigned
SELECT COUNT(*) FROM twilio_number_pool WHERE status = 'ASSIGNED';
-- Result: 3

-- No duplicate client_id in pool
SELECT "client_id", COUNT(*) FROM twilio_number_pool
WHERE "client_id" IS NOT NULL
GROUP BY "client_id"
HAVING COUNT(*) > 1;
-- Result: 0 rows (no duplicates)
```

---

## Test Scenario 6: Forwarding Instructions Without Number

**Goal:** Verify forwarding instructions are blocked if number is missing

### Steps:
1. Create test client with number initially NULL:
```sql
INSERT INTO clients (id, "businessName", region, "phoneNumber", "paymentActive", "twilioNumber")
VALUES ('test-client-no-number', 'No Number Test', 'UK', '447900000999', true, NULL);
```

2. Manually set onboarding state to S6_PHONE_TYPE (bypassing allocation):
```sql
INSERT INTO onboarding_states ("client_id", "current_state", "collected_fields")
VALUES ('test-client-no-number', 'S6_PHONE_TYPE', '{}');
```

3. Attempt to advance to S7 (forwarding instructions):
   - Reply "1" (iPhone)

### Expected Logs:
```
❌ [ONBOARDING] CRITICAL: Twilio number missing at forwarding step
ONBOARDING_BLOCKED_NO_TWILIO_NUMBER {
  clientId: 'test-client-no-number',
  ownerPhone: '447900000999',
  currentState: 'S6_PHONE_TYPE',
  nextState: 'S7_FWD_SENT',
  timestamp: '...'
}
⚠️  [ONBOARDING] BLOCKED - NO TWILIO NUMBER
```

### Expected SMS Response:
```
We're assigning your JobRun number now.

This usually takes a moment.

Reply READY in 1 minute to continue.
```

### Expected DB State:
```sql
-- State should be rolled back to S6_PHONE_TYPE
SELECT "clientId", "current_state" FROM onboarding_states WHERE "client_id" = 'test-client-no-number';
-- Result: currentState = 'S6_PHONE_TYPE'
```

---

## Monitoring Queries

### Check Pool Health
```sql
-- Overall pool status
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM twilio_number_pool
GROUP BY status;
```

### Find Clients Waiting for Numbers
```sql
-- Clients with paymentActive but no twilioNumber
SELECT id, "businessName", "phoneNumber", "paymentActive", "twilioNumber", "createdAt"
FROM clients
WHERE "paymentActive" = true AND "twilioNumber" IS NULL
ORDER BY "createdAt" ASC;
```

### Check Recent Allocations
```sql
SELECT
  p."phoneE164",
  p."client_id",
  c."businessName",
  c."phoneNumber" as owner_phone,
  p."assigned_at"
FROM twilio_number_pool p
JOIN clients c ON c.id = p."client_id"
WHERE p.status = 'ASSIGNED'
ORDER BY p."assigned_at" DESC
LIMIT 10;
```

### Audit Onboarding Blocks
```sql
-- Check for clients stuck at S5 (payment gate)
SELECT
  c.id,
  c."businessName",
  c."phoneNumber",
  c."paymentActive",
  o."current_state",
  o."updated_at"
FROM clients c
JOIN onboarding_states o ON o."client_id" = c.id
WHERE o."current_state" = 'S5_CONFIRM_LIVE'
ORDER BY o."updated_at" DESC;
```

---

## Success Criteria

✅ **Scenario 1**: Payment inactive → blocked with payment message, no allocation
✅ **Scenario 2**: Payment active → number allocated, forwarding instructions use dedicated number
✅ **Scenario 3**: Pool empty → graceful message, no crash, logged for monitoring
✅ **Scenario 4**: Idempotent allocation → same number returned, no duplicates
✅ **Scenario 5**: Concurrent allocation → all succeed with unique numbers
✅ **Scenario 6**: Missing number at forwarding → blocked with retry message, state rolled back

All logs must appear as documented above. No exceptions, no approximations.
