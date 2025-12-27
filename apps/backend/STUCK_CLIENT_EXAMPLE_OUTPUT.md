# Stuck Client Detection - Example Output

## Scenario: 3 Stuck Clients Detected

### Console Log Output (RuntimeMonitor - Every 5 Minutes)

```
✅ Runtime invariant check passed at 2025-12-21T10:30:00.000Z
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  [STUCK_DETECTOR] STUCK CLIENTS DETECTED: 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   HIGH: 1
   MEDIUM: 1
   LOW: 1

STUCK_CLIENT_DETECTED {
  clientId: 'cm1abc123xyz',
  phoneNumber: '447700900123',
  businessName: 'ABC Plumbing',
  currentState: 'S9_TEST_CALL',
  timeInState: '1d 2h',
  severity: 'HIGH',
  reason: 'Hasn\'t completed test call (CRITICAL - no retry mechanism)',
  isTerminal: true,
  paymentActive: true,
  twilioNumberAssigned: true,
  timestamp: '2025-12-21T10:30:00.000Z'
}
STUCK_CLIENT_DETECTED {
  clientId: 'cm1def456uvw',
  phoneNumber: '447700900456',
  businessName: 'XYZ Electrician',
  currentState: 'S5_CONFIRM_LIVE',
  timeInState: '3h',
  severity: 'MEDIUM',
  reason: 'Hasn\'t confirmed activation (may be blocked by payment gate)',
  isTerminal: false,
  paymentActive: false,
  twilioNumberAssigned: false,
  timestamp: '2025-12-21T10:30:00.000Z'
}
STUCK_CLIENT_DETECTED {
  clientId: 'cm1ghi789rst',
  phoneNumber: '447700900789',
  businessName: 'Quick Fix Handyman',
  currentState: 'S1_BUSINESS_TYPE_LOCATION',
  timeInState: '45min',
  severity: 'LOW',
  reason: 'Hasn\'t provided business type and location',
  isTerminal: false,
  paymentActive: false,
  twilioNumberAssigned: false,
  timestamp: '2025-12-21T10:30:00.000Z'
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## HTTP Endpoint Response

### Request:
```bash
curl http://localhost:3001/api/admin/stuck-clients | jq
```

### Response:
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-12-21T10:30:00.000Z",
    "total": 3,
    "byState": {
      "S1_BUSINESS_TYPE_LOCATION": 1,
      "S5_CONFIRM_LIVE": 1,
      "S9_TEST_CALL": 1
    },
    "bySeverity": {
      "HIGH": 1,
      "MEDIUM": 1,
      "LOW": 1
    },
    "clients": [
      {
        "clientId": "cm1abc123xyz",
        "phoneNumber": "447700900123",
        "businessName": "ABC Plumbing",
        "currentState": "S9_TEST_CALL",
        "timeInStateMinutes": 1560,
        "timeInStateHuman": "1d 2h",
        "reason": "Hasn't completed test call (CRITICAL - no retry mechanism)",
        "severity": "HIGH",
        "isTerminal": true,
        "paymentActive": true,
        "twilioNumberAssigned": true,
        "lastUpdated": "2025-12-20T08:30:00.000Z",
        "stuckDetectedAt": "2025-12-21T08:00:00.000Z"
      },
      {
        "clientId": "cm1def456uvw",
        "phoneNumber": "447700900456",
        "businessName": "XYZ Electrician",
        "currentState": "S5_CONFIRM_LIVE",
        "timeInStateMinutes": 180,
        "timeInStateHuman": "3h",
        "reason": "Hasn't confirmed activation (may be blocked by payment gate)",
        "severity": "MEDIUM",
        "isTerminal": false,
        "paymentActive": false,
        "twilioNumberAssigned": false,
        "lastUpdated": "2025-12-21T07:30:00.000Z",
        "stuckDetectedAt": null
      },
      {
        "clientId": "cm1ghi789rst",
        "phoneNumber": "447700900789",
        "businessName": "Quick Fix Handyman",
        "currentState": "S1_BUSINESS_TYPE_LOCATION",
        "timeInStateMinutes": 45,
        "timeInStateHuman": "45min",
        "reason": "Hasn't provided business type and location",
        "severity": "LOW",
        "isTerminal": false,
        "paymentActive": false,
        "twilioNumberAssigned": false,
        "lastUpdated": "2025-12-21T09:45:00.000Z",
        "stuckDetectedAt": null
      }
    ]
  }
}
```

---

## Filtered Queries

### High Severity Only:
```bash
curl http://localhost:3001/api/admin/stuck-clients?severity=HIGH | jq
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-12-21T10:30:00.000Z",
    "total": 1,
    "byState": {
      "S9_TEST_CALL": 1
    },
    "bySeverity": {
      "HIGH": 1,
      "MEDIUM": 0,
      "LOW": 0
    },
    "clients": [
      {
        "clientId": "cm1abc123xyz",
        "phoneNumber": "447700900123",
        "businessName": "ABC Plumbing",
        "currentState": "S9_TEST_CALL",
        "timeInStateMinutes": 1560,
        "timeInStateHuman": "1d 2h",
        "reason": "Hasn't completed test call (CRITICAL - no retry mechanism)",
        "severity": "HIGH",
        "isTerminal": true,
        "paymentActive": true,
        "twilioNumberAssigned": true,
        "lastUpdated": "2025-12-20T08:30:00.000Z",
        "stuckDetectedAt": "2025-12-21T08:00:00.000Z"
      }
    ]
  }
}
```

### Terminal Only:
```bash
curl http://localhost:3001/api/admin/stuck-clients/terminal | jq
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-12-21T10:30:00.000Z",
    "total": 1,
    "clients": [
      {
        "clientId": "cm1abc123xyz",
        "phoneNumber": "447700900123",
        "businessName": "ABC Plumbing",
        "currentState": "S9_TEST_CALL",
        "timeInStateMinutes": 1560,
        "timeInStateHuman": "1d 2h",
        "reason": "Hasn't completed test call (CRITICAL - no retry mechanism)",
        "severity": "HIGH",
        "isTerminal": true,
        "paymentActive": true,
        "twilioNumberAssigned": true,
        "lastUpdated": "2025-12-20T08:30:00.000Z",
        "stuckDetectedAt": "2025-12-21T08:00:00.000Z"
      }
    ]
  }
}
```

---

## No Stuck Clients Scenario

### Console Output:
```
✅ Runtime invariant check passed at 2025-12-21T10:35:00.000Z
✅ [STUCK_DETECTOR] No stuck clients detected
```

### HTTP Response:
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-12-21T10:35:00.000Z",
    "total": 0,
    "byState": {},
    "bySeverity": {
      "HIGH": 0,
      "MEDIUM": 0,
      "LOW": 0
    },
    "clients": []
  }
}
```

---

## Operator Workflow Example

**Morning Check (9:00 AM):**
```bash
curl http://localhost:3001/api/admin/stuck-clients/terminal
```
→ See 1 client stuck at S9_TEST_CALL for 26 hours
→ Call client at 447700900123
→ Help them complete test call

**Midday Check (1:00 PM):**
```bash
curl http://localhost:3001/api/admin/stuck-clients?severity=MEDIUM
```
→ See 1 client stuck at S5_CONFIRM_LIVE (payment gate)
→ Check Stripe for payment confirmation
→ Manually activate payment if confirmed

**Evening Check (5:00 PM):**
```bash
curl http://localhost:3001/api/admin/stuck-clients
```
→ See LOW severity clients
→ Decision: Wait until tomorrow (not urgent)

**Automated Overnight:**
→ RuntimeMonitor runs every 5 minutes
→ Logs all stuck conditions
→ Founder checks logs in morning for any critical alerts

---

## Integration with Daily Operations

**Recommended Schedule:**
- **Every 5 minutes (automatic)**: RuntimeMonitor logs stuck clients
- **3x per day (manual)**: Founder checks endpoint
  - Morning: HIGH + MEDIUM
  - Midday: HIGH only
  - Evening: All severities for planning

**Alert Thresholds:**
- HIGH (>24h stuck): Immediate action required
- MEDIUM (>2h stuck): Check within 4 hours
- LOW (>30min stuck): Monitor, may resolve naturally

**Escalation:**
- If HIGH severity client stuck >48h → Manual SQL intervention
- If MEDIUM severity >12h → Proactive SMS outreach
- If LOW severity >6h → Consider abandonment

---

## Time Savings

**Before Stuck Detection:**
- Founder must manually query database
- Write complex SQL with date calculations
- Check each state individually
- No alerting on critical conditions
- Time: ~20 minutes per check

**After Stuck Detection:**
- One curl command
- Pre-filtered by severity
- Sorted by urgency
- Automatic monitoring every 5 minutes
- Time: ~30 seconds per check

**Daily Time Saved:** ~58 minutes (3 checks/day)
**Monthly Time Saved:** ~29 hours
