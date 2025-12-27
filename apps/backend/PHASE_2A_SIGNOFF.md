# PHASE 2A SIGN-OFF CRITERIA
## JobRun Trial & Cancellation System

**Phase:** 2A (Trial Enforcement & Cancellation, Pre-Stripe)
**Target:** Production-ready internal trial management
**Scope:** Trial eligibility, cancellation confirmation, pricing updates
**Out of Scope:** Stripe integration, webhooks, automated billing

---

## 1. CODE COMPLETENESS

### ✅ Schema Changes

- [x] `BillingStatus` enum created with 5 states (none, trialing, active, canceled, past_due)
- [x] `Client.trialUsedAt` field added (DateTime?, indexed)
- [x] `Client.trialStartedAt` field added (DateTime?)
- [x] `Client.trialEndsAt` field added (DateTime?)
- [x] `Client.billingStatus` field added (BillingStatus, default: none, indexed)
- [x] `Client.pendingCancellation` field added (Boolean, default: false, indexed)
- [x] `Client.cancellationRequestedAt` field added (DateTime?)
- [x] Prisma client regenerated with new types
- [x] Migration file created: `add_trial_and_cancellation_tracking`

### ✅ SMS Routing (twilio.ts)

- [x] PRIORITY 0: CANCEL keyword detection (lines 357-448)
  - [x] Handles: CANCEL, STOP, UNSUBSCRIBE (case-insensitive)
  - [x] Validates client exists by phoneNumber
  - [x] Checks billing_status eligibility
  - [x] Implements 24-hour timeout for stale requests
  - [x] Sets pendingCancellation flag
  - [x] Sends confirmation warning prompt

- [x] PRIORITY 0.5: YES/NO confirmation handling (lines 450-527)
  - [x] YES: Finalizes cancellation (status=canceled, paymentActive=false, trialUsedAt set)
  - [x] NO: Aborts cancellation (clears pending flags)
  - [x] Only processes if pendingCancellation=true

- [x] PRIORITY 0.75: Ambiguous input handler (lines 529-548)
  - [x] Re-prompts if user sends anything other than YES/NO during pending cancellation
  - [x] Prevents accidental cancellation from typos

### ✅ Payment Gate (OnboardingService.ts)

- [x] GATE 1: Trial eligibility check (lines 732-758)
  - [x] Blocks if `trialUsedAt IS NOT NULL`
  - [x] Sends clear error message
  - [x] Logs TRIAL_ALREADY_USED event
  - [x] Does NOT advance onboarding state

- [x] GATE 2: Payment status check (lines 765-797)
  - [x] Blocks if `paymentActive = false`
  - [x] Shows updated pricing (£49/month after 7-day trial)
  - [x] Placeholder Stripe URL (ready for Phase 2B)
  - [x] Logs PAYMENT_REQUIRED event

### ✅ Pricing Copy Updates

- [x] OnboardingService.ts line 778: "£49/month after a 7-day free trial" (was £29)
- [x] All mentions of £29 removed from active code paths
- [x] Trial language added ("after a 7-day free trial")

---

## 2. BEHAVIORAL DETERMINISM

### ✅ One-Trial-Per-Phone Enforcement

**Rule:** Each phone number gets exactly ONE trial, ever.

**Enforcement Points:**
1. `trialUsedAt` is set ONCE when trial starts OR user cancels
2. `trialUsedAt` is NEVER cleared or reset
3. Payment gate checks `trialUsedAt` before allowing S5→S6 transition
4. Cancellation sets `trialUsedAt` if not already set

**Verified By:**
- Test Case 2: Re-onboarding blocked
- Test Case 10: Re-onboarding after cancellation blocked

**Pass Criteria:**
- [ ] User cannot restart onboarding if trialUsedAt IS NOT NULL
- [ ] Manual DB reset is only way to bypass (intentional admin action)
- [ ] Logs show "TRIAL_ALREADY_USED" when enforcement triggers

### ✅ Cancellation Requires Confirmation

**Rule:** Cancellation is permanent and requires explicit YES confirmation.

**Enforcement Points:**
1. CANCEL keyword sets `pendingCancellation = true`
2. User must reply "YES" to finalize (case-insensitive)
3. User can reply "NO" to abort
4. Ambiguous input re-prompts for YES/NO
5. Timeout after 24 hours auto-aborts stale requests

**Verified By:**
- Test Case 3: YES confirmation finalizes
- Test Case 4: NO aborts without changes
- Test Case 6: Ambiguous input re-prompts
- Test Case 8: Timeout auto-aborts

**Pass Criteria:**
- [ ] Accidental CANCEL cannot immediately cancel trial
- [ ] User is warned about permanent consequences
- [ ] Clear path to abort (NO)
- [ ] No silent state corruption

### ✅ State Transitions Are Explicit

**Rule:** No silent state changes. Every major action is logged and visible.

**Logged Events:**
- `TRIAL_ALREADY_USED` - Trial eligibility check failed
- `PAYMENT_REQUIRED` - Payment gate blocked progression
- `CANCELLATION_REQUESTED` - User texted CANCEL
- `CANCELLATION_CONFIRMED` - User confirmed YES
- `CANCELLATION_ABORTED` - User replied NO

**Pass Criteria:**
- [ ] Every state transition has corresponding log entry
- [ ] Logs are JSON-structured with timestamp, clientId, phoneNumber
- [ ] Logs are searchable in Railway console
- [ ] No "ghost" state changes (DB updates without logs)

---

## 3. IDEMPOTENCY

### ✅ Duplicate Message Handling

**Verified By:**
- Test Case 7: CANCEL sent multiple times
- Existing onboarding idempotency (lastMessageSid)

**Pass Criteria:**
- [ ] Repeated CANCEL commands do not create duplicate pending states
- [ ] SMS idempotency via Twilio MessageSid preserved
- [ ] Database constraints prevent race conditions (unique indexes)

### ✅ State Consistency

**Guarantees:**
1. `pendingCancellation = true` → `cancellationRequestedAt IS NOT NULL`
2. `billingStatus = canceled` → `paymentActive = false`
3. `billingStatus = canceled` → `trialUsedAt IS NOT NULL`
4. `billingStatus = trialing` → `paymentActive = true` (when trial active)

**Pass Criteria:**
- [ ] No orphaned states (e.g., pendingCancellation=true with NULL timestamp)
- [ ] State transitions are atomic (no partial updates)
- [ ] DB constraints enforce invariants

---

## 4. ABUSE RESISTANCE

### ✅ Trial Reuse Prevention

**Attack Vector:** User cancels trial, deletes OnboardingState, tries to re-onboard

**Defense:**
- `trialUsedAt` persists on Client record (independent of OnboardingState)
- Payment gate checks Client.trialUsedAt BEFORE allocating resources
- Deleting OnboardingState does NOT reset trial eligibility

**Verified By:**
- Test Case 10: Re-onboarding after cancellation blocked

**Pass Criteria:**
- [ ] Trial reuse blocked even after OnboardingState deletion
- [ ] trialUsedAt survives OnboardingState deletion
- [ ] No code path clears trialUsedAt

### ✅ Non-Owner Cancellation Prevention

**Attack Vector:** Malicious actor texts CANCEL from different phone

**Defense:**
- CANCEL handler finds client by sender's phoneNumber (normalizedFrom)
- Only owner phone number stored in Client.phoneNumber can trigger cancellation

**Verified By:**
- Test Case 9: Non-owner CANCEL silently fails

**Pass Criteria:**
- [ ] Only owner phone can cancel
- [ ] Non-owner attempts silently ignored (no error message)
- [ ] No info leak about client existence

---

## 5. OPERATIONAL CONFIDENCE

### ✅ Logs Explain All Actions

**Required Log Levels:**
- ERROR: System failures, unexpected states
- WARN: Blocked actions (trial reuse, payment gate)
- INFO: State transitions, confirmations
- DEBUG: (not required for Phase 2A)

**Log Searchability:**
```
Railway logs search terms:
- "TRIAL_ALREADY_USED" → find blocked re-onboarding attempts
- "CANCELLATION_REQUESTED" → find all cancellation attempts
- "CANCELLATION_CONFIRMED" → find finalized cancellations
- "PAYMENT_REQUIRED" → find payment gate hits
```

**Pass Criteria:**
- [ ] Every major action has structured log entry
- [ ] Logs include clientId, phoneNumber, timestamp
- [ ] Logs are searchable in Railway console
- [ ] Error logs include stack traces

### ✅ Manual Recovery Procedures

**Scenario 1: User claims trial eligibility incorrectly blocked**

**Diagnosis:**
```sql
SELECT
  id,
  phone_number,
  billing_status,
  trial_used_at,
  created_at
FROM clients
WHERE phone_number = '<user_phone>';
```

**Resolution:**
- If `trial_used_at` is genuinely erroneous (e.g., test data bleed):
  ```sql
  UPDATE clients
  SET trial_used_at = NULL
  WHERE id = '<client_id>';
  ```
- If `trial_used_at` is legitimate: explain policy to user, no override

**Scenario 2: User stuck in pendingCancellation=true**

**Diagnosis:**
```sql
SELECT
  id,
  phone_number,
  pending_cancellation,
  cancellation_requested_at
FROM clients
WHERE pending_cancellation = true;
```

**Resolution:**
- If timeout not yet triggered (< 24 hours): wait or ask user to text YES/NO
- If stuck (> 24 hours): should auto-clear on next CANCEL, or manual clear:
  ```sql
  UPDATE clients
  SET
    pending_cancellation = false,
    cancellation_requested_at = NULL
  WHERE id = '<client_id>';
  ```

**Pass Criteria:**
- [ ] Manual recovery procedures documented
- [ ] SQL queries provided for common scenarios
- [ ] Rollback procedures exist (if needed)

---

## 6. KNOWN LIMITATIONS (ACCEPTABLE FOR PHASE 2A)

### ⚠️ Trial Expiry Not Enforced

**Issue:** `trialEndsAt` is stored but no cron job checks it
**Impact:** Users could get >7 days of free trial
**Mitigation:** Deferred to Stripe webhook (Phase 2B)
**Workaround:** Manual SQL query to find expired trials

**Acceptance:** This is acceptable for Phase 2A. Stripe will enforce in Phase 2B.

### ⚠️ No Payment Verification

**Issue:** `paymentActive` is boolean with no link to payment record
**Impact:** Manual DB manipulation can bypass payment
**Mitigation:** Stripe integration (Phase 2B) will add stripeCustomerId validation
**Workaround:** Assume honest actors, manual admin oversight

**Acceptance:** This is acceptable for Phase 2A. Internal trial only.

### ⚠️ Migration Requires Railway Console

**Issue:** Local migration failed due to shadow DB error (BOM characters in stub migrations)
**Impact:** Migration must be run on Railway after deployment
**Mitigation:** Run via Railway CLI or admin panel:
```bash
railway run npx prisma migrate deploy
```

**Acceptance:** Migration will run successfully on Railway production DB.

---

## 7. PHASE 2A COMPLETION CHECKLIST

### Code Changes

- [x] Schema updated (7 new fields, 1 enum)
- [x] Prisma client regenerated
- [x] CANCEL detection added (twilio.ts)
- [x] Payment gate updated (OnboardingService.ts)
- [x] Pricing copy updated (£29 → £49)
- [x] All BOM characters removed from migration files

### Documentation

- [x] Test specification created (PHASE_2A_TEST_SPEC.md)
- [x] Sign-off criteria created (PHASE_2A_SIGNOFF.md)
- [x] Manual recovery procedures documented

### Testing

- [ ] All 10 test cases pass on Railway production
- [ ] Logs show clean execution for all tests
- [ ] No manual DB fixes required during tests
- [ ] State transitions are deterministic

### Deployment

- [ ] Code merged to main branch
- [ ] Railway auto-deployed
- [ ] Migration applied via Railway console:
      ```bash
      railway run npx prisma migrate deploy
      railway run npx prisma generate
      ```
- [ ] Health check confirms app running
- [ ] Test phone number verified working

### Sign-Off

- [ ] All test cases pass
- [ ] Logs reviewed and clean
- [ ] No critical bugs identified
- [ ] Manual recovery procedures tested
- [ ] Phase 2A scope confirmed (no scope creep)

---

## 8. EXPLICITLY OUT OF SCOPE (DO NOT DO)

The following are **explicitly out of scope** for Phase 2A and **must not** be implemented:

### ❌ Stripe Integration
- No Stripe SDK imports
- No checkout session creation
- No webhook handlers
- No subscription management
- Placeholder URL is intentional

### ❌ Automated Billing
- No cron jobs for trial expiry
- No automated charges
- No invoice generation
- No payment method collection

### ❌ Webhooks
- No Stripe webhooks
- No external webhook endpoints
- No webhook signature verification

### ❌ Admin Dashboards
- No billing admin UI
- No trial management UI
- No cancellation override UI

### ❌ Analytics
- No billing analytics
- No trial conversion tracking
- No cancellation metrics dashboard

### ❌ Pricing Experiments
- No A/B testing
- No dynamic pricing
- No discount codes
- No referral programs

### ❌ UI Polish
- No email confirmations
- No SMS receipt formatting
- No branded SMS templates

**Any of the above invalidates Phase 2A scope.**

---

## 9. HANDOFF TO PHASE 2B

**Phase 2A Deliverables:**
1. Trial eligibility enforcement (one-trial-per-phone)
2. Cancellation confirmation flow (CANCEL → YES/NO)
3. Pricing copy updated (£49/month after 7-day trial)
4. Database schema ready for Stripe integration
5. Payment gate placeholder for Stripe checkout URL

**Phase 2B Will Add:**
1. Stripe SDK integration
2. Checkout session creation
3. Webhook handlers (checkout.session.completed, invoice.payment_succeeded, etc.)
4. Subscription lifecycle management
5. Trial expiry enforcement (via Stripe)
6. Payment failure handling
7. Actual billing

**Phase 2A → 2B Bridge:**
- `billingStatus` enum already includes states needed for Stripe (active, past_due)
- Trial tracking fields (trialStartedAt, trialEndsAt) ready for Stripe metadata
- Payment gate already shows trial pricing and has placeholder for checkout URL
- Cancellation flow will integrate with Stripe subscription.cancel()

---

## 10. FINAL SIGN-OFF STATEMENT

**Phase 2A is considered COMPLETE and PRODUCTION-READY when:**

1. ✅ All 10 test cases pass consecutively without manual intervention
2. ✅ Railway logs show clean, deterministic execution
3. ✅ One-trial-per-phone rule is enforced and cannot be bypassed
4. ✅ Cancellation requires explicit YES confirmation
5. ✅ Pricing copy shows £49/month after 7-day trial
6. ✅ State transitions are logged and explainable
7. ✅ No scope creep (nothing from "Out of Scope" list was implemented)
8. ✅ Manual recovery procedures tested and documented
9. ✅ Migration applied successfully on Railway
10. ✅ No critical or blocking bugs identified

**Signed off by:** ___________________________
**Date:** ___________________________
**Phase 2A Status:** [ ] READY FOR PRODUCTION

---

**Phase 2A execution plan complete. Awaiting real-world test results for review.**
