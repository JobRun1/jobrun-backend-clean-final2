# Observability & Alert Configuration

## Metrics Available

### 1. Conversation Mode Invariant Violations

**Pipeline Invariant:**
```
conversation.invariant_violation.pipeline{actualMode="ONBOARDING",expectedMode="OPERATIONAL"}
```

**Handler Invariant:**
```
conversation.invariant_violation.handler{actualMode="ONBOARDING",expectedMode="OPERATIONAL"}
```

**What it means:** A conversation with the wrong mode reached an operational processing path.

**Expected value:** **0** (should NEVER occur in production)

**Alert if:** Any count > 0

---

### 2. Conversation Creation by Mode

**Metric:**
```
conversation.created{mode="OPERATIONAL"}
conversation.created{mode="ONBOARDING"}
```

**What it means:** Tracks how many conversations are created with each mode.

**Expected values:**
- `mode="OPERATIONAL"`: > 0 (customers interacting with business)
- `mode="ONBOARDING"`: 0 (onboarding doesn't create conversations)

**Alert if:** `mode="ONBOARDING"` > 0

---

## Required Alerts

### Critical Alert 1: Invariant Violation Detection

**Name:** `conversation_mode_contamination_detected`

**Condition:**
```
sum(conversation.invariant_violation.pipeline) > 0
OR
sum(conversation.invariant_violation.handler) > 0
```

**Severity:** **P0 - Critical**

**Action:**
1. Page ops team immediately
2. Check logs for correlationId and conversationId
3. Investigate root cause (regression? database corruption?)
4. Verify no data contamination occurred

**Query Examples:**

```javascript
// Total violations in last 5 minutes
sum(rate(conversation.invariant_violation.pipeline[5m]))
+ sum(rate(conversation.invariant_violation.handler[5m]))
> 0
```

```bash
# Search logs for invariant violations
grep "INVARIANT VIOLATION" /var/log/app.log | tail -20

# Filter by correlation ID
grep "correlationId.*abc123" /var/log/app.log
```

---

### Warning Alert 2: Unexpected ONBOARDING Conversation Creation

**Name:** `onboarding_conversation_created`

**Condition:**
```
sum(conversation.created{mode="ONBOARDING"}) > 0
```

**Severity:** **P2 - Warning**

**Action:**
1. Review recent code changes
2. Check if new endpoint was added without mode parameter
3. Verify no customer impact (onboarding conversations should be orphaned)

---

## Log Queries for Forensics

### Find All Invariant Violations

**Structured logs include:**
- `correlationId` - Twilio request ID for tracing
- `invariantName` - Which invariant failed (e.g., "pipeline.mode_check")
- `conversationId` - The conversation that violated invariant
- `actualMode` - The mode that was found
- `expectedMode` - The mode that was expected
- `clientId` - Client affected
- `customerId` - Customer affected

**Example log entry:**
```json
{
  "correlationId": "RM1234567890abcdef",
  "timestamp": "2026-01-03T15:30:45.123Z",
  "invariantName": "pipeline.mode_check",
  "conversationId": "conv_abc123",
  "actualMode": "ONBOARDING",
  "expectedMode": "OPERATIONAL",
  "customerId": "cust_xyz789",
  "customerPhone": "+15555551234",
  "clientId": "client_456"
}
```

### Query Examples

**Find violations by correlation ID:**
```bash
grep '"correlationId":"RM1234567890abcdef"' /var/log/app.log
```

**Find violations for specific conversation:**
```bash
grep '"conversationId":"conv_abc123"' /var/log/app.log
```

**Find violations by customer:**
```bash
grep '"customerId":"cust_xyz789"' /var/log/app.log | grep "INVARIANT VIOLATION"
```

**Count violations in last hour:**
```bash
grep "INVARIANT VIOLATION" /var/log/app.log \
  | grep "$(date -u -d '1 hour ago' +%Y-%m-%d)" \
  | wc -l
```

---

## Metrics Dashboard Queries

### Prometheus/Grafana

**Invariant Violation Rate (5min window):**
```promql
sum(rate(conversation_invariant_violation_pipeline[5m]))
+ sum(rate(conversation_invariant_violation_handler[5m]))
```

**Conversation Creation by Mode:**
```promql
sum by (mode) (conversation_created)
```

**Violations by Mode (breakdown):**
```promql
sum by (actualMode, expectedMode) (conversation_invariant_violation_pipeline)
```

---

### StatsD/DataDog

**Invariant Violations:**
```
conversation.invariant_violation.pipeline:0|c|#actualMode:ONBOARDING,expectedMode:OPERATIONAL
conversation.invariant_violation.handler:0|c|#actualMode:ONBOARDING,expectedMode:OPERATIONAL
```

**Conversation Creation:**
```
conversation.created:1|c|#mode:OPERATIONAL
conversation.created:0|c|#mode:ONBOARDING
```

---

## Alert Response Playbook

### If Invariant Violation Alert Fires

**Step 1: Assess Scope**
```bash
# Count total violations
grep "INVARIANT VIOLATION" /var/log/app.log | wc -l

# Get unique conversation IDs
grep "INVARIANT VIOLATION" /var/log/app.log \
  | grep -oP '"conversationId":"[^"]*"' \
  | sort | uniq
```

**Step 2: Identify Root Cause**
- Check recent deployments (last 24h)
- Review code changes to conversation creation
- Check database for manual mode changes
- Verify no schema migration issues

**Step 3: Verify Data Integrity**
```sql
-- Check for conversations with wrong mode
SELECT id, mode, "clientId", "customerId", "createdAt"
FROM conversations
WHERE mode = 'ONBOARDING'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Check for messages in ONBOARDING conversations
SELECT COUNT(*) FROM messages
WHERE "conversationId" IN (
  SELECT id FROM conversations WHERE mode = 'ONBOARDING'
);
```

**Step 4: Customer Impact Assessment**
- No violations = No customer impact
- Violations with empty TwiML = Customer got no response (lost message)
- Violations with errors = Twilio may have retried

**Step 5: Mitigation**
- If regression: Revert deployment immediately
- If database corruption: Run cleanup script
- If systematic: Apply hotfix

---

## Monitoring Frequency

**Real-time (alerts):**
- Invariant violations (check every 1 minute)

**Daily (dashboard review):**
- Total conversations created by mode
- Invariant violation trend (should be flat at zero)

**Weekly (health check):**
- Review orphaned conversations (mode=ONBOARDING with no messages)
- Verify metrics collection is working

---

## Success Criteria

✅ **System is healthy if:**
- `conversation.invariant_violation.*` = 0 (always)
- `conversation.created{mode="OPERATIONAL"}` > 0 (daily)
- `conversation.created{mode="ONBOARDING"}` = 0 (always)

❌ **Immediate investigation required if:**
- Any invariant violation count > 0
- ONBOARDING conversations being created
- Metrics stop being reported (collection failure)

---

## Testing Alerts

**Manual trigger (staging only):**

```typescript
// Manually create ONBOARDING conversation to test alerts
const testConversation = await prisma.conversation.create({
  data: {
    clientId: 'test-client',
    customerId: 'test-customer',
    mode: 'ONBOARDING', // This should trigger alert
  },
});

// Simulate customer reply (will hit invariant)
// POST /sms with customer phone
// Expect: invariant violation metric incremented
```

**Verify alert fires:**
1. Check metrics: `conversation.invariant_violation.pipeline` should increment
2. Check logs: Should see "INVARIANT VIOLATION" error with correlationId
3. Check alerting system: Should receive page/notification

---

### 3. Voice Call SYSTEM Fail-Safe Intake

**Metric:**
```
voice.system_failsafe_intake{isKnown="false",callStatus="no-answer"}
```

**What it means:** A customer called an unregistered/misconfigured number, and the SYSTEM fail-safe sent them a generic intake SMS.

**Expected value:** **0** (all numbers should be registered in TwilioNumberPool with proper roles)

**Alert if:** Count > 0 in last 24 hours

**Severity:** **P3 - Warning** (customer got response, but number needs registration)

**What the human should do:**
1. Check logs for the unregistered number
   ```bash
   grep "SYSTEM NUMBER CALL DETECTED" /var/log/app.log | tail -20
   ```

2. Identify the number role:
   ```bash
   grep "SYSTEM FAILSAFE" /var/log/app.log | grep -oP 'to:\s*\K[+0-9]*' | sort | uniq
   ```

3. Determine appropriate action:
   - **If number should be OPERATIONAL:** Add to TwilioNumberPool and assign to client
     ```sql
     INSERT INTO "TwilioNumberPool" ("phoneE164", "role", "clientId", "isActive")
     VALUES ('+447700900999', 'OPERATIONAL', 'client-id-here', true);
     ```

   - **If number should be ONBOARDING:** Add to TwilioNumberPool as ONBOARDING
     ```sql
     INSERT INTO "TwilioNumberPool" ("phoneE164", "role", "isActive")
     VALUES ('+447700900999', 'ONBOARDING', true);
     ```

   - **If number should be decommissioned:** Remove from Twilio account
     - Go to Twilio Console → Phone Numbers
     - Release the number or update webhook URLs

4. Verify customer impact:
   - Customer received fail-safe SMS (no black hole) ✅
   - Customer message: "We missed your call. Please reply with details..."
   - If customer replied, their message may be orphaned (check /sms logs)

5. Monitor metric:
   - If alert fires repeatedly for same number → urgent action required
   - If alert fires once → configuration drift, fix during business hours

**Query Examples:**
```bash
# Find all SYSTEM fail-safe activations in last 24h
grep "SYSTEM FAILSAFE" /var/log/app.log \
  | grep "$(date -u -d '24 hours ago' +%Y-%m-%d)" \
  | wc -l

# Get unique numbers triggering fail-safe
grep "SYSTEM FAILSAFE" /var/log/app.log \
  | grep -oP '"to":"[^"]*"' \
  | sort | uniq -c

# Check if customer replied after fail-safe SMS
grep "correlationId.*<correlation-id-from-failsafe>" /var/log/app.log
```

**Prevention:**
- All production Twilio numbers MUST be in TwilioNumberPool
- Pre-deployment checklist: Verify all numbers have explicit roles
- Weekly audit: Check for SYSTEM number activations

---

**Last Updated:** 2026-01-03
**Owner:** Platform Engineering
