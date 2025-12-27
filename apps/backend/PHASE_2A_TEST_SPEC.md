# PHASE 2A TEST SPECIFICATION
## JobRun Trial & Cancellation System

**Test Environment:** Production (Railway)
**Test Phone:** Your actual mobile device
**Onboarding Number:** 07476955179
**Phase:** 2A (Pre-Stripe, Internal Trial Enforcement)

---

## TEST PREREQUISITES

- [ ] Database migration applied (BillingStatus enum + 6 new Client fields)
- [ ] Prisma client regenerated
- [ ] Code deployed to Railway
- [ ] Access to Railway logs (real-time)
- [ ] Access to production database (read-only for verification)
- [ ] Test phone number ready (will be used as owner phone)

---

## TEST CASE 1: HAPPY PATH - ONBOARDING TO PAYMENT GATE

**Objective:** Verify complete onboarding flow reaches payment gate with correct pricing

**Steps:**
1. Call 07476955179 from test phone → let it ring → hang up (miss call)
2. Wait for initial onboarding SMS
3. Reply: "Plumber from London"
4. Wait for business name prompt
5. Reply: "Test Plumbing Ltd"
6. Wait for owner name prompt
7. Reply: "Test Owner"
8. Wait for notification preference prompt
9. Reply: "SMS"
10. Wait for confirmation prompt
11. Reply: "YES"
12. Receive payment gate message

**Expected System Reply (Step 12):**
```
Perfect! One last step before we go live.

JobRun costs £49/month after a 7-day free trial.

To activate, confirm payment here:
https://buy.stripe.com/test_XXXXX (placeholder)

Reply READY once you've confirmed.
```

**Expected DB State After Step 12:**
```sql
SELECT
  id,
  phone_number,
  billing_status,
  payment_active,
  trial_used_at,
  pending_cancellation
FROM clients
WHERE phone_number = '<your_test_phone>';
```

**Expected Values:**
- `billing_status` = `'none'`
- `payment_active` = `false`
- `trial_used_at` = `NULL`
- `pending_cancellation` = `false`
- `OnboardingState.currentState` = `'S5_CONFIRM_LIVE'` (stuck at payment gate)

**Expected Logs:**
```
💳 [PAYMENT_GATE] Checking trial eligibility and payment status
✅ [PAYMENT_GATE] Trial eligible (trialUsedAt is null)
❌ [PAYMENT_GATE] Payment not active - showing trial signup
PAYMENT_REQUIRED { clientId: '...', ownerPhone: '...', timestamp: '...' }
⚠️  [ONBOARDING] BLOCKED BY PAYMENT GATE
```

**Pass Criteria:**
- [✓] Message contains "£49/month" (NOT £29)
- [✓] Message contains "after a 7-day free trial"
- [✓] Onboarding state stuck at S5_CONFIRM_LIVE
- [✓] trialUsedAt is NULL
- [✓] billingStatus is 'none'

---

## TEST CASE 2: TRIAL ELIGIBILITY ENFORCEMENT (RE-ONBOARDING BLOCKED)

**Objective:** Verify one-trial-per-phone rule is enforced permanently

**Prerequisites:**
- Complete Test Case 1
- Manually set `trial_used_at = NOW()` in database:
  ```sql
  UPDATE clients
  SET trial_used_at = NOW()
  WHERE phone_number = '<your_test_phone>';
  ```

**Steps:**
1. Delete OnboardingState record for test client:
   ```sql
   DELETE FROM onboarding_states
   WHERE client_id = '<your_client_id>';
   ```
2. Text 07476955179: "Electrician from Manchester"
3. Reply through onboarding until step 11 (Reply "YES" at S5_CONFIRM_LIVE)

**Expected System Reply (Step 3 onwards):**
- Should proceed through onboarding normally until S5 → S6 transition
- At S5 → S6 transition, receive trial lockout message:

```
This phone number has already used a JobRun trial.

Trial eligibility is one per phone number.

If you believe this is an error, contact support.
```

**Expected DB State:**
- `trial_used_at` = `<timestamp>` (unchanged from manual set)
- `OnboardingState.currentState` = `'S5_CONFIRM_LIVE'` (stuck)
- `twilioNumber` = `NULL` (not allocated)

**Expected Logs:**
```
💳 [PAYMENT_GATE] Checking trial eligibility and payment status
❌ [PAYMENT_GATE] Trial already used - blocking onboarding
TRIAL_ALREADY_USED { clientId: '...', phoneNumber: '...', trialUsedAt: '...', timestamp: '...' }
⚠️  [ONBOARDING] BLOCKED BY TRIAL ELIGIBILITY
```

**Pass Criteria:**
- [✓] User cannot proceed past S5_CONFIRM_LIVE
- [✓] trialUsedAt preserved (not reset)
- [✓] No Twilio number allocated
- [✓] Clear error message received

---

## TEST CASE 3: CANCEL TRIAL - CONFIRM WITH YES

**Objective:** Verify cancellation confirmation flow and permanent trial burnout

**Prerequisites:**
- Fresh test phone number (not used in previous tests)
- Complete onboarding to payment gate
- Manually activate trial:
  ```sql
  UPDATE clients
  SET
    payment_active = true,
    billing_status = 'trialing',
    trial_used_at = NOW(),
    trial_started_at = NOW(),
    trial_ends_at = NOW() + INTERVAL '7 days'
  WHERE phone_number = '<new_test_phone>';
  ```

**Steps:**
1. Text: "CANCEL"
2. Receive confirmation warning
3. Text: "YES"
4. Receive cancellation confirmation

**Expected System Reply (Step 2):**
```
⚠️ Are you sure you want to cancel your JobRun trial?

If you cancel now, you will NOT be able to use JobRun again with this phone number.

Reply YES to confirm cancellation or NO to continue your trial.
```

**Expected System Reply (Step 4):**
```
Your JobRun trial has been cancelled.

No charges will occur.

You will not be able to restart JobRun with this phone number.

Thank you for trying JobRun.
```

**Expected DB State After Step 4:**
```sql
SELECT
  billing_status,
  payment_active,
  trial_used_at,
  pending_cancellation,
  cancellation_requested_at
FROM clients
WHERE phone_number = '<new_test_phone>';
```

**Expected Values:**
- `billing_status` = `'canceled'`
- `payment_active` = `false`
- `trial_used_at` = `<timestamp>` (NOT NULL - preserved)
- `pending_cancellation` = `false`
- `cancellation_requested_at` = `NULL`

**Expected Logs:**
```
🛑 [CANCEL] Keyword detected: CANCEL
✅ [CANCEL] Client found: <client_id>
✅ [CANCEL] Pending cancellation set
CANCELLATION_REQUESTED { clientId: '...', phoneNumber: '...', billingStatus: 'trialing', timestamp: '...' }

--- After YES ---

✅ [CANCEL] YES received for pending cancellation
CANCELLATION_CONFIRMED { clientId: '...', phoneNumber: '...', finalStatus: 'canceled', timestamp: '...' }
```

**Pass Criteria:**
- [✓] Confirmation prompt received before cancellation
- [✓] Final status is 'canceled'
- [✓] paymentActive = false
- [✓] trialUsedAt preserved (not NULL)
- [✓] pendingCancellation cleared

---

## TEST CASE 4: CANCEL TRIAL - ABORT WITH NO

**Objective:** Verify cancellation can be aborted without consequences

**Prerequisites:**
- Active trial (same setup as Test Case 3)

**Steps:**
1. Text: "CANCEL"
2. Receive confirmation warning
3. Text: "NO"
4. Receive abort confirmation

**Expected System Reply (Step 2):**
```
⚠️ Are you sure you want to cancel your JobRun trial?

If you cancel now, you will NOT be able to use JobRun again with this phone number.

Reply YES to confirm cancellation or NO to continue your trial.
```

**Expected System Reply (Step 4):**
```
Cancellation aborted.

Your JobRun trial continues.

We're here if you need us!
```

**Expected DB State After Step 4:**
- `billing_status` = `'trialing'` (UNCHANGED)
- `payment_active` = `true` (UNCHANGED)
- `trial_used_at` = `<timestamp>` (UNCHANGED)
- `pending_cancellation` = `false`
- `cancellation_requested_at` = `NULL`

**Expected Logs:**
```
🛑 [CANCEL] Keyword detected: CANCEL
✅ [CANCEL] Pending cancellation set
CANCELLATION_REQUESTED { ... }

--- After NO ---

✅ [CANCEL] NO received for pending cancellation
CANCELLATION_ABORTED { clientId: '...', phoneNumber: '...', timestamp: '...' }
```

**Pass Criteria:**
- [✓] Trial status unchanged
- [✓] paymentActive still true
- [✓] pendingCancellation cleared
- [✓] User can continue using service

---

## TEST CASE 5: CANCEL WHEN NOT SUBSCRIBED

**Objective:** Verify graceful handling when CANCEL sent before trial starts

**Prerequisites:**
- Fresh phone number
- Onboarding to S3_OWNER_NAME (mid-onboarding, no trial started)

**Steps:**
1. During onboarding (at any state before payment gate), text: "CANCEL"

**Expected System Reply:**
```
You are not currently subscribed to JobRun.
```

**Expected DB State:**
- `billing_status` = `'none'`
- `pending_cancellation` = `false`
- Onboarding continues normally if user texts valid response

**Expected Logs:**
```
🛑 [CANCEL] Keyword detected: CANCEL
✅ [CANCEL] Client found: <client_id>
⚠️  [CANCEL] Client not eligible (status: none)
```

**Pass Criteria:**
- [✓] Clear message that user is not subscribed
- [✓] No state corruption
- [✓] Onboarding can continue normally

---

## TEST CASE 6: AMBIGUOUS INPUT DURING PENDING CANCELLATION

**Objective:** Verify non-YES/NO replies re-prompt correctly

**Prerequisites:**
- Active trial
- Text "CANCEL" to start pending cancellation

**Steps:**
1. Text: "CANCEL"
2. Receive confirmation warning
3. Text: "Maybe"
4. Receive re-prompt
5. Text: "Wait"
6. Receive re-prompt
7. Text: "NO"
8. Receive abort confirmation

**Expected System Reply (Steps 4 & 6):**
```
Please reply YES to confirm cancellation or NO to continue your trial.
```

**Expected Logs:**
```
⚠️  [CANCEL] Ambiguous input during pending cancellation: Maybe
⚠️  [CANCEL] Ambiguous input during pending cancellation: Wait
```

**Pass Criteria:**
- [✓] All non-YES/NO inputs re-prompt
- [✓] Final NO successfully aborts
- [✓] No state corruption from ambiguous input

---

## TEST CASE 7: CANCEL SENT MULTIPLE TIMES (IDEMPOTENCY)

**Objective:** Verify repeated CANCEL commands are idempotent

**Prerequisites:**
- Active trial

**Steps:**
1. Text: "CANCEL"
2. Receive confirmation warning
3. Text: "CANCEL" again (before replying YES/NO)
4. Receive same prompt (not duplicate pending state)

**Expected System Reply (Step 4):**
```
Please reply YES to confirm cancellation or NO to continue your trial.
```

**Expected DB State:**
- `pending_cancellation` = `true` (still true, not doubled)
- `cancellation_requested_at` = `<original_timestamp>` (unchanged)

**Expected Logs:**
```
🛑 [CANCEL] Keyword detected: CANCEL
⚠️  [CANCEL] Already pending - checking timeout
```

**Pass Criteria:**
- [✓] No duplicate state corruption
- [✓] Same prompt returned
- [✓] Single pending cancellation record

---

## TEST CASE 8: PENDING CANCELLATION TIMEOUT (24 HOURS)

**Objective:** Verify stale cancellation requests auto-expire

**Prerequisites:**
- Active trial
- Text "CANCEL" to start pending cancellation
- Manually set `cancellation_requested_at = NOW() - INTERVAL '25 hours'`

**Steps:**
1. Set stale timestamp:
   ```sql
   UPDATE clients
   SET cancellation_requested_at = NOW() - INTERVAL '25 hours'
   WHERE phone_number = '<test_phone>';
   ```
2. Text: "CANCEL" again

**Expected System Reply:**
```
Cancellation request expired. Your trial continues. Text CANCEL again if needed.
```

**Expected DB State After Step 2:**
- `pending_cancellation` = `false`
- `cancellation_requested_at` = `NULL`
- `billing_status` = `'trialing'` (unchanged)

**Expected Logs:**
```
🛑 [CANCEL] Keyword detected: CANCEL
⚠️  [CANCEL] Already pending - checking timeout
```

**Pass Criteria:**
- [✓] Stale request cleared
- [✓] User notified of expiry
- [✓] Trial continues unaffected

---

## TEST CASE 9: NON-OWNER CANNOT CANCEL

**Objective:** Verify only owner phone can trigger cancellation

**Prerequisites:**
- Active trial with owner phone = +447700900000
- Different phone number = +447700900001

**Steps:**
1. From +447700900001 (non-owner), text 07476955179: "CANCEL"

**Expected System Reply:**
- No reply (silent fail)

**Expected DB State:**
- Owner's client record unchanged
- `pending_cancellation` = `false`
- `billing_status` = `'trialing'`

**Expected Logs:**
```
🛑 [CANCEL] Keyword detected: CANCEL
   From: 447700900001
⚠️  [CANCEL] No client found for phone: 447700900001
```

**Pass Criteria:**
- [✓] No cancellation initiated
- [✓] Owner's trial unaffected
- [✓] Silent fail (no error message to non-owner)

---

## TEST CASE 10: RE-ONBOARDING AFTER CANCELLATION BLOCKED

**Objective:** Verify canceled users cannot restart onboarding

**Prerequisites:**
- Completed Test Case 3 (trial canceled)
- `billing_status` = `'canceled'`
- `trial_used_at` = `<timestamp>`

**Steps:**
1. Delete OnboardingState:
   ```sql
   DELETE FROM onboarding_states
   WHERE client_id = '<canceled_client_id>';
   ```
2. Text 07476955179: "Gardener from Bristol"
3. Complete onboarding through to S5_CONFIRM_LIVE
4. Reply "YES" at S5

**Expected System Reply (Step 4):**
```
This phone number has already used a JobRun trial.

Trial eligibility is one per phone number.

If you believe this is an error, contact support.
```

**Expected DB State:**
- `trial_used_at` = `<original_timestamp>` (unchanged)
- `billing_status` = `'canceled'` (may be unchanged or could be 'none' if new onboarding started)
- Cannot proceed past S5_CONFIRM_LIVE

**Pass Criteria:**
- [✓] Re-onboarding blocked at payment gate
- [✓] trialUsedAt preserved
- [✓] User cannot bypass with new onboarding

---

## TEST SUMMARY CHECKLIST

Before Phase 2A sign-off, ALL tests must pass:

- [ ] Test 1: Happy path onboarding with £49 pricing ✓
- [ ] Test 2: Trial eligibility enforced ✓
- [ ] Test 3: Cancellation with YES confirmation ✓
- [ ] Test 4: Cancellation aborted with NO ✓
- [ ] Test 5: CANCEL when not subscribed ✓
- [ ] Test 6: Ambiguous input re-prompts ✓
- [ ] Test 7: CANCEL idempotency ✓
- [ ] Test 8: Pending cancellation timeout ✓
- [ ] Test 9: Non-owner cannot cancel ✓
- [ ] Test 10: Re-onboarding after cancel blocked ✓

**All tests must pass exactly as described before sign-off.**

---

## FAILURE ESCALATION

If any test fails:

1. **Document exact failure:**
   - Test case number
   - Step where it failed
   - Expected vs actual behavior
   - Railway logs at time of failure
   - DB state at time of failure

2. **Root cause analysis:**
   - Is it a logic bug?
   - Is it a state machine bug?
   - Is it a DB migration issue?
   - Is it a timing/race condition?

3. **Fix and re-test:**
   - Fix code
   - Re-deploy to Railway
   - Re-run full test suite
   - DO NOT cherry-pick tests

4. **Sign-off only when:**
   - All 10 tests pass consecutively
   - No manual DB fixes required
   - Logs show clean execution
   - State transitions are deterministic

---

## NOTES

- Tests must be run on production Railway environment (not local)
- Database must have Phase 2A migration applied
- Use real phone numbers for SMS testing
- Twilio logs should be monitored in parallel
- DO NOT modify DB state mid-test (except where explicitly instructed for test setup)
- Each test should start from a clean, known state
