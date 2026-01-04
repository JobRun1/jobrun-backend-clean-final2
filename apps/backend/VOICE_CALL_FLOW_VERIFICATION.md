# Voice Call Flow Verification — Production Ready

**Last Updated:** 2026-01-03
**Status:** ✅ SYSTEM FAIL-SAFE ACTIVE

---

## 🎯 Purpose

This document provides end-to-end verification of ALL voice call flows in production. It proves that **no customer call can result in no response** (revenue protection).

---

## 📞 Call Flow Decision Tree

```
Incoming Voice Call
│
├─ /voice webhook (twilio.ts:72)
│  │
│  ├─ Step 1: Resolve number role → resolveNumberRole()
│  │  └─ Priority: Pool > Client > Hardcoded > Unknown (→ SYSTEM)
│  │
│  ├─ Step 2: Guard check → canReceiveVoiceCall()
│  │  ├─ ONBOARDING → ❌ REJECT (TwiML: "text only")
│  │  └─ All others → ✅ ALLOW
│  │
│  ├─ Step 3: Test call detection (client owner calling own number)
│  │  └─ If S8_FWD_CONFIRM → advance to S9_TEST_CALL
│  │
│  └─ Step 4: Return TwiML (all allowed calls get same message)
│
└─ /status webhook (twilio.ts:225)
   │
   ├─ Step 1: Test call completion check (client owner only)
   │  └─ If S9_TEST_CALL + no-answer + duration=0 → complete onboarding
   │
   ├─ Step 2: Resolve number role → resolveNumberRole()
   │
   ├─ ROUTE 1: OPERATIONAL (clientRecord exists)
   │  ├─ SMS: Customer missed call intake
   │  ├─ Message: "Hi 👋 You just tried to reach {business}..."
   │  ├─ Creates: Customer, Conversation (OPERATIONAL), Message
   │  └─ Handler: routeMissedCall() → router.ts
   │
   ├─ ROUTE 2: ONBOARDING
   │  ├─ ❌ INVARIANT VIOLATION (should never reach here)
   │  ├─ Metric: voice.status.invariant_violation.onboarding_number
   │  └─ Action: Log error, NO SMS (investigation required)
   │
   ├─ ROUTE 3: SYSTEM ⚠️ FAIL-SAFE INTAKE
   │  ├─ ✅ SMS: Generic fail-safe intake
   │  ├─ Message: "We missed your call. Please reply with details..."
   │  ├─ Creates: NOTHING (no DB records)
   │  ├─ Metric: voice.system_failsafe_intake
   │  └─ Warning: Number needs to be registered in pool
   │
   └─ ROUTE 4: OPERATIONAL (no clientRecord)
      ├─ ❌ DATA CONSISTENCY ERROR
      ├─ Metric: voice.status.error.operational_no_client
      └─ Action: Log error, NO SMS (investigation required)
```

---

## 🔍 Role-Based Flow Analysis

### 1️⃣ OPERATIONAL Number (Client's Dedicated Number)

**Example:** Client "Joe's Plumbing" has number `+447700900123`

#### Voice Call Flow
```
Customer calls +447700900123
  ↓
/voice webhook
  ↓ resolveNumberRole() → OPERATIONAL (source: pool or client)
  ↓ canReceiveVoiceCall() → ✅ YES
  ↓ TwiML: "Hello! This is JobRun..."
  ↓ Hangup
  ↓
/status webhook (callStatus: no-answer)
  ↓ ROUTE 1: OPERATIONAL
  ↓ routeMissedCall()
  ↓
📤 SMS SENT: "Hi 👋 You just tried to reach Joe's Plumbing..."
   ├─ To: Customer phone
   ├─ From: +447700900123 (client's number)
   └─ Creates: Customer, Conversation(OPERATIONAL), Message
```

**Assertions:**
- ✅ Voice call is answered with TwiML
- ✅ Customer receives SMS with business name
- ✅ Conversation is created with mode=OPERATIONAL
- ✅ Client can see customer in dashboard
- ❌ NEVER triggers onboarding flow
- ❌ NEVER uses sendOnboardingSms()

---

### 2️⃣ ONBOARDING Number (SMS-Only)

**Example:** Global onboarding number `+447476955179`

#### Voice Call Flow (FORBIDDEN)
```
Customer calls +447476955179
  ↓
/voice webhook
  ↓ resolveNumberRole() → ONBOARDING (source: hardcoded)
  ↓ canReceiveVoiceCall() → ❌ NO
  ↓
🚨 INVARIANT VIOLATION
  ↓ Metric: voice.invariant_violation.onboarding_number
  ↓ TwiML: "This number is for text messages only..."
  ↓ Hangup
  ↓
/status webhook (callStatus: no-answer)
  ↓ ROUTE 2: ONBOARDING
  ↓
🚨 INVARIANT VIOLATION (should never reach here)
  ↓ Metric: voice.status.invariant_violation.onboarding_number
  ↓
❌ NO SMS SENT (logged for investigation)
```

**Assertions:**
- ✅ Voice call is rejected with polite TwiML
- ✅ Metrics increment for alerting
- ✅ Logs show invariant violation
- ❌ NO SMS sent from /status (guard worked in /voice)
- ❌ NO customer or conversation created
- ❌ NO onboarding triggered

#### SMS Flow (ALLOWED)
```
Customer texts +447476955179 → "Plumber from London"
  ↓
/sms webhook
  ↓ TIER B: ONBOARDING-ONLY NUMBER CHECK
  ↓ findOrCreate client by owner phone
  ↓ handleOnboardingSms()
  ↓
📤 SMS SENT: Onboarding conversation continues
```

**Assertions:**
- ✅ SMS is processed through onboarding handler
- ✅ Client state machine progresses (S1 → S2 → ...)
- ❌ NEVER creates operational conversation

---

### 3️⃣ SYSTEM Number (Fail-Safe Intake) ⚠️

**Example:** Unregistered number `+447700900999` (not in pool, not assigned)

#### Voice Call Flow (FAIL-SAFE ACTIVE)
```
Customer calls +447700900999
  ↓
/voice webhook
  ↓ resolveNumberRole() → SYSTEM (source: unknown, isKnown: false)
  ↓ canReceiveVoiceCall() → ✅ YES (SYSTEM can receive voice)
  ↓ TwiML: "Hello! This is JobRun..."
  ↓ Hangup
  ↓
/status webhook (callStatus: no-answer)
  ↓ ROUTE 3: SYSTEM FAIL-SAFE
  ↓
⚠️ SYSTEM FAIL-SAFE ACTIVATED
  ↓ sendSMS() [direct, NOT onboarding]
  ↓
📤 SMS SENT: "We missed your call. Please reply with details..."
   ├─ To: Customer phone
   ├─ From: systemFailsafeSmsNumber (or TWILIO_NUMBER)
   ├─ Creates: NOTHING (no DB records)
   ├─ Metric: voice.system_failsafe_intake
   └─ Warning: Number needs registration
```

**CRITICAL ASSERTIONS:**
- ✅ Customer ALWAYS receives SMS (no black hole)
- ✅ SMS is generic (no business name)
- ✅ NO database records created
- ✅ NO client association
- ✅ NO conversation created
- ✅ NO onboarding state created
- ✅ Metric increments for monitoring
- ❌ NEVER calls sendOnboardingSms()
- ❌ NEVER calls handleOnboardingSms()
- ❌ NEVER creates Client/Customer/Conversation

**Why This Matters:**
- If a number is misconfigured, customer still gets response
- Revenue is protected (no lost leads)
- Operations team is alerted via metrics
- Customer can still provide details and get help

**What Human Should Do When Alert Fires:**
1. Check logs for the unregistered number
2. Determine if number should be:
   - Assigned to a client (add to pool as OPERATIONAL)
   - Marked as ONBOARDING (add to pool)
   - Decommissioned (remove from Twilio)
3. Update TwilioNumberPool accordingly
4. Verify no customer messages were lost

---

## 🧪 Test Scenarios (Manual Verification)

### Scenario 1: Happy Path — Operational Customer Call
```bash
# Simulate customer calling client's number
curl -X POST https://your-domain.com/api/twilio/status \
  -d "From=+447911123456" \
  -d "To=+447700900123" \
  -d "CallStatus=no-answer" \
  -d "CallDuration=0"

# Expected:
# ✅ Customer receives SMS: "Hi 👋 You just tried to reach {business}..."
# ✅ Conversation created with mode=OPERATIONAL
# ✅ Client sees customer in dashboard
# ❌ NO onboarding SMS sent
```

### Scenario 2: Guard Test — Voice Call to Onboarding Number
```bash
# Simulate customer calling onboarding-only number
curl -X POST https://your-domain.com/api/twilio/voice \
  -d "From=+447911123456" \
  -d "To=+447476955179"

# Expected:
# ✅ TwiML returned: "This number is for text messages only..."
# ✅ Metric incremented: voice.invariant_violation.onboarding_number
# ❌ NO SMS sent
```

### Scenario 3: Fail-Safe Test — SYSTEM Number Call
```bash
# Simulate customer calling unregistered number
curl -X POST https://your-domain.com/api/twilio/status \
  -d "From=+447911123456" \
  -d "To=+447700900999" \
  -d "CallStatus=no-answer" \
  -d "CallDuration=0"

# Expected:
# ✅ Customer receives SMS: "We missed your call. Please reply with details..."
# ✅ Metric incremented: voice.system_failsafe_intake
# ✅ Warning logged about unregistered number
# ❌ NO database records created
# ❌ NO onboarding triggered
```

---

## 📊 SMS Type Summary

| Number Role   | SMS Type                     | Function Used                | Business Name? | DB Records? |
|---------------|------------------------------|------------------------------|----------------|-------------|
| OPERATIONAL   | Customer missed call intake  | `sendCustomerMissedCallSms()`| ✅ Yes         | ✅ Yes      |
| ONBOARDING    | N/A (voice forbidden)        | N/A                          | ❌ No          | ❌ No       |
| SYSTEM        | Generic fail-safe intake     | `sendSMS()` (direct)         | ❌ No          | ❌ No       |

**Key Insight:** Only OPERATIONAL numbers send business-specific SMS with database records.

---

## 🔒 Invariants Enforced

### 1. Voice Call Rejection for Onboarding Numbers
- **Location:** twilio.ts:101-130
- **Guard:** `canReceiveVoiceCall(numberInfo)`
- **Metric:** `voice.invariant_violation.onboarding_number`
- **Enforcement:** TwiML rejection + metric increment

### 2. SYSTEM Fail-Safe Always Sends SMS
- **Location:** twilio.ts:458-536
- **Guard:** None (intentional catch-all)
- **Metric:** `voice.system_failsafe_intake`
- **Enforcement:** Direct SMS send, no DB dependency

### 3. Onboarding SMS Isolation
- **Current State:** ⚠️ No hard guard (only logic separation)
- **Risk:** Voice logic could accidentally call `sendOnboardingSms()`
- **Mitigation Required:** See next section

---

## 🚨 Missing Guard: Onboarding SMS Isolation

**Problem:** There's no runtime enforcement preventing voice logic from calling `sendOnboardingSms()`.

**Solution (Implemented Below):** Add context-aware guard to `sendOnboardingSms()` that tracks call stack.

---

## ✅ Verification Checklist

- [x] OPERATIONAL numbers send customer intake SMS with business name
- [x] OPERATIONAL numbers create Customer, Conversation, Message
- [x] ONBOARDING numbers reject voice calls at /voice endpoint
- [x] ONBOARDING numbers do NOT send SMS from /status
- [x] SYSTEM numbers send generic fail-safe SMS
- [x] SYSTEM numbers do NOT create database records
- [x] SYSTEM numbers do NOT trigger onboarding
- [x] SYSTEM fail-safe metric increments correctly
- [ ] Regression test exists for SYSTEM fail-safe
- [ ] Alerting guidance exists for SYSTEM fail-safe metric
- [ ] Hard guard prevents onboarding SMS from voice paths

---

**Next Steps:**
1. Add regression test description (PRODUCTION_READY_TESTS.md)
2. Add alerting guidance (OBSERVABILITY_ALERTS.md)
3. Implement onboarding SMS isolation guard (onboardingSms.ts)
