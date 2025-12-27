# OPERATOR COCKPIT V1 — BACKEND DOCUMENTATION

**Purpose:** Provides founder/operator with complete control over JobRun client lifecycle and operational state.

**Scope:** Backend-only. No UI. All endpoints are REST APIs callable via curl/Postman/Insomnia.

---

## 📋 ENDPOINTS OVERVIEW

### **Visibility (GET)**
- `GET /api/admin/alerts` — View recent ops alerts
- `GET /api/admin/stuck-clients` — View clients stuck in onboarding
- `GET /api/admin/clients` — List all clients (existing endpoint)
- `GET /api/admin/clients/:id` — View specific client details (existing endpoint)

### **Control (PATCH)**
- `PATCH /api/admin/clients/:id/mute-alerts` — Toggle ops alert muting
- `PATCH /api/admin/clients/:id/reset-payment-alert` — Clear payment gate alert suppression
- `PATCH /api/admin/clients/:id/reset-stuck` — Clear stuck client detection flag

### **Destruction (DELETE)**
- `DELETE /api/admin/clients/:id` — **PERMANENTLY** delete client and all data

---

## 🔍 VISIBILITY ENDPOINTS

### GET /api/admin/alerts

**Purpose:** View recent ops alerts from AlertLog table.

**Query Parameters:**
- `limit` (optional): Number of alerts to return (default: 50, max: 200)
- `alertType` (optional): Filter by alert type (`STUCK_CLIENT`, `PAYMENT_BLOCK`, `POOL_EMPTY`)
- `severity` (optional): Filter by severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
- `resourceId` (optional): Filter by specific resource (e.g., client ID)

**Example Requests:**
```bash
# Get last 50 alerts
curl http://localhost:3001/api/admin/alerts

# Get last 100 critical alerts
curl http://localhost:3001/api/admin/alerts?limit=100&severity=CRITICAL

# Get all payment block alerts
curl http://localhost:3001/api/admin/alerts?alertType=PAYMENT_BLOCK

# Get alerts for specific client
curl http://localhost:3001/api/admin/alerts?resourceId=default-client
```

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "clx...",
        "createdAt": "2025-12-24T10:00:00Z",
        "alertType": "STUCK_CLIENT",
        "alertKey": "stuck_S9_TEST_CALL_default-client",
        "severity": "HIGH",
        "resourceId": "default-client",
        "deliveredAt": "2025-12-24T10:00:01Z",
        "channel": "sms",
        "metadata": { ... }
      }
    ],
    "total": 42,
    "showing": 50
  }
}
```

---

### GET /api/admin/stuck-clients

**Purpose:** View clients currently stuck in onboarding (existing endpoint, now with alert context).

**Query Parameters:**
- `severity` (optional): Filter by severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
- `terminal` (optional): Filter terminal stuck clients only (`true` or omit)

**Example Requests:**
```bash
# Get all stuck clients
curl http://localhost:3001/api/admin/stuck-clients

# Get high-severity stuck clients
curl http://localhost:3001/api/admin/stuck-clients?severity=HIGH

# Get terminal stuck clients (require manual intervention)
curl http://localhost:3001/api/admin/stuck-clients?terminal=true
```

---

## 🎛️ CONTROL ENDPOINTS (SOFT RESETS)

### PATCH /api/admin/clients/:id/mute-alerts

**Purpose:** Toggle ops alert muting for a client.

**Use Case:** Testing, demos, or temporarily silencing alerts for a specific client.

**Safety:** Does NOT affect data or payment state. Only controls alert delivery.

**Request Body:**
```json
{
  "muted": true  // or false to unmute
}
```

**Example:**
```bash
# Mute alerts for client
curl -X PATCH http://localhost:3001/api/admin/clients/default-client/mute-alerts \
  -H "Content-Type: application/json" \
  -d '{"muted": true}'

# Unmute alerts
curl -X PATCH http://localhost:3001/api/admin/clients/default-client/mute-alerts \
  -H "Content-Type: application/json" \
  -d '{"muted": false}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "clientId": "default-client",
    "businessName": "Test Business",
    "opsAlertsMuted": true
  }
}
```

---

### PATCH /api/admin/clients/:id/reset-payment-alert

**Purpose:** Clear `paymentGateAlertedAt` to allow payment gate alerts to fire again.

**Use Case:** Client was alerted about payment block, issue resolved, but alert suppression prevents re-alerting if they get stuck again.

**Safety:** Does NOT affect payment state or billing. Only clears alert suppression timestamp.

**Request:** No body required.

**Example:**
```bash
curl -X PATCH http://localhost:3001/api/admin/clients/default-client/reset-payment-alert
```

**Response:**
```json
{
  "success": true,
  "data": {
    "clientId": "default-client",
    "businessName": "Test Business",
    "paymentGateAlertedAt": null,
    "message": "Payment gate alert suppression cleared. Client can be alerted again if stuck."
  }
}
```

**Logs:**
```
[AdminCockpit] Payment gate alert RESET for client default-client (Test Business)
   Previous alert: 2025-12-24T08:00:00Z
```

---

### PATCH /api/admin/clients/:id/reset-stuck

**Purpose:** Clear `stuckDetectedAt` on OnboardingState to reset stuck client detection.

**Use Case:** Client was marked as stuck, operator manually intervened, want to reset detection so alerts can fire again if needed.

**Safety:** Does NOT affect onboarding state or progression. Only clears stuck detection timestamp.

**Request:** No body required.

**Example:**
```bash
curl -X PATCH http://localhost:3001/api/admin/clients/default-client/reset-stuck
```

**Response:**
```json
{
  "success": true,
  "data": {
    "clientId": "default-client",
    "businessName": "Test Business",
    "stuckDetectedAt": null,
    "message": "Stuck detection reset. Client can be detected as stuck again if necessary."
  }
}
```

**Logs:**
```
[AdminCockpit] Stuck detection RESET for client default-client (Test Business)
   Previous detection: 2025-12-24T06:00:00Z
```

---

## 🗑️ HARD DELETE (DANGEROUS)

### DELETE /api/admin/clients/:id

**Purpose:** PERMANENTLY delete a client and ALL associated data.

**⚠️ CRITICAL WARNING:** This is IRREVERSIBLE. No backups. No undo. Use with extreme caution.

---

### SAFETY CHECKS (ALL MUST PASS)

The endpoint enforces 5 safety checks before allowing deletion:

1. **Client must exist**
2. **`onboardingComplete` must be `false`** (inactive clients only)
3. **`opsAlertsMuted` must be `true`** (explicit operator confirmation step)
4. **`paymentActive` must be `false`** (no active billing)
5. **Request body must include exact business name match** (typo protection)

**If ANY check fails, deletion is REJECTED with 400 error.**

---

### DELETION ORDER (Atomic Transaction)

All deletions happen in a single database transaction. If ANY step fails, the entire transaction is rolled back (nothing deleted).

**Order:**
1. Release Twilio number back to pool (if assigned) → status=AVAILABLE
2. Delete onboarding states
3. Delete messages
4. Delete customers
5. Delete bookings
6. Delete conversations
7. Delete leads
8. Delete users
9. Delete alert logs (where resourceId = clientId)
10. Delete client record

---

### HOW TO DELETE A CLIENT (STEP-BY-STEP)

**Step 1: Mute alerts** (required for safety check)
```bash
curl -X PATCH http://localhost:3001/api/admin/clients/default-client/mute-alerts \
  -H "Content-Type: application/json" \
  -d '{"muted": true}'
```

**Step 2: Verify client is inactive and not paying**
```bash
curl http://localhost:3001/api/admin/clients/default-client
```

Check response:
- `onboardingComplete: false` ✅
- `paymentActive: false` ✅
- `opsAlertsMuted: true` ✅ (from step 1)

**Step 3: Execute deletion with business name confirmation**
```bash
curl -X DELETE http://localhost:3001/api/admin/clients/default-client \
  -H "Content-Type: application/json" \
  -d '{"confirmBusinessName": "Test Business"}'
```

**⚠️ CRITICAL:** Business name MUST match exactly (case-sensitive, whitespace-sensitive).

---

### SUCCESS RESPONSE

```json
{
  "success": true,
  "data": {
    "deleted": true,
    "clientId": "default-client",
    "businessName": "Test Business",
    "deletionLog": {
      "clientId": "default-client",
      "businessName": "Test Business",
      "deletedAt": "2025-12-24T10:00:00Z",
      "twilioNumberReleased": "+447700900001",
      "recordsDeleted": {
        "onboardingStates": 1,
        "messages": 42,
        "customers": 5,
        "bookings": 3,
        "conversations": 5,
        "leads": 5,
        "users": 0,
        "alertLogs": 2
      }
    }
  }
}
```

**Logs:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  [AdminCockpit] DELETE REQUEST RECEIVED
   Client ID: default-client
   Confirmation: Test Business
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ [AdminCockpit] Client found: Test Business
✅ [AdminCockpit] All safety checks passed
⚠️  [AdminCockpit] Beginning IRREVERSIBLE deletion transaction...
   📞 Releasing Twilio number: +447700900001
   ✅ Number released: +447700900001
   ✅ Deleted 1 onboarding states
   ✅ Deleted 42 messages
   ✅ Deleted 5 customers
   ✅ Deleted 3 bookings
   ✅ Deleted 5 conversations
   ✅ Deleted 5 leads
   ✅ Deleted 0 users
   ✅ Deleted 2 alert logs
   ✅ Deleted client: Test Business
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ [AdminCockpit] CLIENT DELETED SUCCESSFULLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELETION LOG:
{
  "clientId": "default-client",
  "businessName": "Test Business",
  "deletedAt": "2025-12-24T10:00:00Z",
  "twilioNumberReleased": "+447700900001",
  "recordsDeleted": { ... }
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### ERROR RESPONSES

**404 — Client Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Client not found"
  }
}
```

**400 — Safety Checks Failed:**
```json
{
  "success": false,
  "error": {
    "code": "SAFETY_CHECK_FAILED",
    "message": "Cannot delete client. Safety checks failed.",
    "details": {
      "violations": [
        "Client is ACTIVE (onboardingComplete=true). Cannot delete active clients.",
        "Alerts NOT muted (opsAlertsMuted=false). Mute alerts first to confirm deletion intent.",
        "Payment is ACTIVE (paymentActive=true). Cannot delete paying customers.",
        "Business name confirmation mismatch. Expected: \"Test Business\", Got: \"test business\""
      ]
    }
  }
}
```

**Logs:**
```
❌ [AdminCockpit] DELETE REJECTED: Safety checks failed
   1. Client is ACTIVE (onboardingComplete=true). Cannot delete active clients.
   2. Alerts NOT muted (opsAlertsMuted=false). Mute alerts first to confirm deletion intent.
   3. Payment is ACTIVE (paymentActive=true). Cannot delete paying customers.
   4. Business name confirmation mismatch. Expected: "Test Business", Got: "test business"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**500 — Transaction Failed:**
```json
{
  "success": false,
  "error": {
    "code": "DELETE_FAILED",
    "message": "Failed to delete client. Transaction rolled back."
  }
}
```

**Logs:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ [AdminCockpit] DELETE FAILED (TRANSACTION ROLLED BACK)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Error: [Prisma error details]
Client ID: default-client
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🧪 MANUAL TESTING CHECKLIST

### ✅ Visibility Endpoints

- [ ] **GET /api/admin/alerts** returns alerts successfully
- [ ] **GET /api/admin/alerts?severity=CRITICAL** filters correctly
- [ ] **GET /api/admin/alerts?alertType=STUCK_CLIENT** filters correctly
- [ ] **GET /api/admin/stuck-clients** returns stuck clients

---

### ✅ Control Endpoints (Soft Resets)

- [ ] **PATCH /api/admin/clients/:id/mute-alerts**
  - [ ] Muting sets `opsAlertsMuted=true`
  - [ ] Unmuting sets `opsAlertsMuted=false`
  - [ ] Returns 404 for non-existent client
  - [ ] Returns 400 for invalid body (non-boolean)

- [ ] **PATCH /api/admin/clients/:id/reset-payment-alert**
  - [ ] Clears `paymentGateAlertedAt` to null
  - [ ] Logs previous alert timestamp
  - [ ] Returns 404 for non-existent client

- [ ] **PATCH /api/admin/clients/:id/reset-stuck**
  - [ ] Clears `stuckDetectedAt` to null on OnboardingState
  - [ ] Logs previous detection timestamp
  - [ ] Returns 404 for non-existent client
  - [ ] Returns 404 if client has no OnboardingState

---

### ✅ Hard Delete (DANGEROUS)

**Test 1: Safety Check — Active Client**
- [ ] Create active client (`onboardingComplete=true`)
- [ ] Attempt delete → REJECTED with "Client is ACTIVE" error

**Test 2: Safety Check — Alerts Not Muted**
- [ ] Create inactive client (`opsAlertsMuted=false`)
- [ ] Attempt delete → REJECTED with "Alerts NOT muted" error

**Test 3: Safety Check — Payment Active**
- [ ] Create client with `paymentActive=true`
- [ ] Attempt delete → REJECTED with "Payment is ACTIVE" error

**Test 4: Safety Check — Business Name Mismatch**
- [ ] Mute alerts for client
- [ ] Attempt delete with wrong business name → REJECTED with "Business name confirmation mismatch" error

**Test 5: Successful Deletion**
- [ ] Create inactive client (`onboardingComplete=false`, `paymentActive=false`)
- [ ] Mute alerts (`opsAlertsMuted=true`)
- [ ] Assign Twilio number from pool
- [ ] Create messages, customers, bookings for client
- [ ] Execute delete with correct business name
- [ ] Verify client deleted
- [ ] Verify Twilio number released back to pool (status=AVAILABLE)
- [ ] Verify all dependent records deleted
- [ ] Verify alert logs deleted (resourceId match)
- [ ] Verify deletion log returned with counts

**Test 6: Transaction Rollback**
- [ ] Simulate database error mid-transaction
- [ ] Verify NOTHING deleted (atomic rollback)

---

## 🛡️ EDGE CASES DISCOVERED

### Client Without Twilio Number
- **Scenario:** Client has `twilioNumber=null`
- **Behavior:** Skip pool release step, log no number assigned
- **Status:** ✅ Handled (checks `if (client.twilioNumber)`)

### Twilio Number Not in Pool
- **Scenario:** Client has `twilioNumber` but number doesn't exist in pool
- **Behavior:** Log warning, continue deletion
- **Status:** ✅ Handled (checks `if (poolRecord)`)

### Client Without OnboardingState
- **Scenario:** Client exists but has no OnboardingState record
- **Behavior:** reset-stuck endpoint returns 404
- **Status:** ✅ Handled explicitly

### Client With No Dependent Records
- **Scenario:** Brand new client with no messages, customers, etc.
- **Behavior:** Delete succeeds, all counts = 0
- **Status:** ✅ Handled (deleteMany returns count=0)

### Alert Logs Not Referencing Client
- **Scenario:** Alert logs exist but `resourceId` doesn't match client
- **Behavior:** Only delete logs where `resourceId = clientId`
- **Status:** ✅ Handled (WHERE clause filters correctly)

---

## 📊 DELETION TRANSACTION ORDERING EXPLANATION

**Why this specific order?**

1. **Release Twilio number FIRST** — Ensures inventory freed before anything else fails
2. **Delete child records BEFORE client** — Avoids foreign key violations
3. **Delete in dependency order** — Prevents cascade issues
4. **Delete alert logs (no FK)** — Safe to delete at any point (using resourceId match)
5. **Delete client LAST** — Once all dependencies cleared

**Why use transaction?**
- **Atomicity:** All-or-nothing deletion
- **Consistency:** No partial deletes (avoid orphaned records)
- **Isolation:** Prevents concurrent operations from seeing partial state
- **Rollback:** Any error undoes entire operation

**Why no cascade deletes?**
- **Explicit control:** Operator knows exactly what's being deleted
- **Audit trail:** Deletion log shows exact counts
- **Safety:** Prevents accidental cascade to unexpected tables
- **Debugging:** Explicit ordering makes failures easier to diagnose

---

## 🚨 PRODUCTION SAFETY NOTES

1. **NO BACKUPS** — Deletion is permanent. No Prisma soft deletes. No audit log retention.
2. **NO UNDO** — Once deleted, data is gone forever from database.
3. **Manual Confirmation Required** — Business name exact match prevents typos.
4. **Alert Muting Required** — Forces operator to take explicit confirmation step.
5. **Active Client Protection** — Cannot delete onboarding-complete clients.
6. **Payment Protection** — Cannot delete paying customers.
7. **Atomic Transaction** — Failure rolls back entire operation (no partial deletes).
8. **Extensive Logging** — All operations logged to console for audit trail.

---

## 📝 OPERATOR WORKFLOW (RECOMMENDED)

**For stuck/abandoned clients:**
1. View stuck clients: `GET /api/admin/stuck-clients`
2. View client details: `GET /api/admin/clients/:id`
3. Assess: Can client be salvaged?
   - **YES:** Reset stuck detection, manually contact
   - **NO:** Proceed to deletion

**For deletion:**
1. Confirm client is inactive and not paying
2. Mute alerts: `PATCH /api/admin/clients/:id/mute-alerts`
3. Wait 24 hours (cooling-off period, optional but recommended)
4. Execute delete with business name confirmation
5. Verify deletion log matches expectations
6. Check Twilio pool has number back (if applicable)

---

**Last Updated:** 2025-12-24
**Status:** PRODUCTION-READY ✅
**Backend Engineer:** Operator Cockpit V1 Implementation
