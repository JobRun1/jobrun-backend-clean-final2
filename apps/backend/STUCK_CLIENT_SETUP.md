# Stuck Client Detection - Setup Guide

## Quick Start (3 Commands)

```bash
# 1. Apply database migration
npx prisma migrate dev --name add_stuck_detection

# 2. Generate Prisma client
npx prisma generate

# 3. Restart server
npm run dev
```

That's it. System is now operational.

---

## Verification

### 1. Check Migration Applied
```bash
# Should show stuck_detected_at column
npx prisma studio
# Navigate to onboarding_states table → verify new column exists
```

### 2. Test Endpoint
```bash
curl http://localhost:3001/api/admin/stuck-clients
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-12-21T...",
    "total": 0,
    "byState": {},
    "bySeverity": { "HIGH": 0, "MEDIUM": 0, "LOW": 0 },
    "clients": []
  }
}
```

### 3. Verify RuntimeMonitor Integration
```bash
# Watch logs for stuck detection
npm run dev | grep STUCK_DETECTOR
```

**Expected Output (every 5 minutes in production):**
```
✅ [STUCK_DETECTOR] No stuck clients detected
```

---

## Create Test Data (Optional)

To verify detection works:

```sql
-- Connect to your database
psql $DATABASE_URL

-- Create a stuck client
INSERT INTO clients (id, business_name, region, phone_number, payment_active)
VALUES ('test-stuck-1', 'Test Business', 'UK', '447700900999', true);

INSERT INTO onboarding_states (client_id, current_state, updated_at)
VALUES ('test-stuck-1', 'S9_TEST_CALL', NOW() - INTERVAL '30 hours');

-- Query stuck clients via API
curl http://localhost:3001/api/admin/stuck-clients
```

**Should Return:**
```json
{
  "total": 1,
  "clients": [
    {
      "clientId": "test-stuck-1",
      "currentState": "S9_TEST_CALL",
      "severity": "HIGH",
      "isTerminal": true,
      "timeInStateHuman": "1d 6h"
    }
  ]
}
```

**Cleanup:**
```sql
DELETE FROM onboarding_states WHERE client_id = 'test-stuck-1';
DELETE FROM clients WHERE id = 'test-stuck-1';
```

---

## Production Deployment

### Pre-Deployment Checklist
- [ ] Review `STUCK_CLIENT_DETECTION.md`
- [ ] Understand threshold values
- [ ] Test endpoint in development
- [ ] Verify migration is safe (it's additive only)
- [ ] Bookmark endpoint URL for quick access

### Deployment Steps
```bash
# 1. Deploy schema change
npx prisma migrate deploy

# 2. Regenerate client
npx prisma generate

# 3. Restart application
# (Railway/Heroku will auto-restart on deploy)
```

### Post-Deployment Verification
```bash
# Check endpoint works
curl https://your-production-url.com/api/admin/stuck-clients

# Monitor logs for automatic detection
# Should see output every 5 minutes (production only)
```

---

## Daily Usage

### Morning Routine (9:00 AM)
```bash
# Check for critical stuck clients
curl http://localhost:3001/api/admin/stuck-clients/terminal
```

Action: Call any clients stuck >24h

### Midday Check (1:00 PM)
```bash
# Check medium severity
curl http://localhost:3001/api/admin/stuck-clients?severity=MEDIUM
```

Action: Resolve payment blocks, pool issues

### Evening Review (5:00 PM)
```bash
# See all stuck clients for planning
curl http://localhost:3001/api/admin/stuck-clients
```

Action: Schedule follow-ups for next day

---

## Troubleshooting

### "Cannot find module 'StuckClientDetector'"
```bash
# Restart TypeScript compiler
npm run build

# Or restart dev server
npm run dev
```

### "Column stuck_detected_at does not exist"
```bash
# Migration not applied - run:
npx prisma migrate deploy
npx prisma generate
```

### "No stuck clients detected but I know there are some"
Check:
1. Are clients actually in incomplete states?
   ```sql
   SELECT * FROM onboarding_states WHERE current_state != 'COMPLETE';
   ```

2. Have thresholds been exceeded?
   ```sql
   SELECT
     client_id,
     current_state,
     updated_at,
     EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_in_state
   FROM onboarding_states
   WHERE current_state != 'COMPLETE';
   ```

3. Check threshold values in `services/StuckClientDetector.ts`

### "Getting stuck alerts every 5 minutes for same client"
`stuckDetectedAt` not being updated. Check:
```sql
SELECT stuck_detected_at FROM onboarding_states WHERE client_id = 'xxx';
```

If NULL after alert, database update is failing. Check logs for errors.

---

## Customization

### Adjust Thresholds
Edit `apps/backend/src/services/StuckClientDetector.ts`:

```typescript
const STUCK_THRESHOLDS: StateThreshold[] = [
  {
    state: "S9_TEST_CALL",
    thresholdMinutes: 1440, // Change to 720 (12 hours) if too long
    severity: "HIGH",
    // ...
  },
  // ... other thresholds
];
```

No migration needed - thresholds are code-only.

### Change Alert Suppression Window
Default: 6 hours between re-alerts

Edit `StuckClientDetector.detectAndLog()`:
```typescript
const isNewStuckCondition = !client.stuckDetectedAt ||
  this.calculateMinutesInState(client.stuckDetectedAt, now) > 360; // Change 360 to desired minutes
```

### Disable Automatic Detection
Edit `RuntimeMonitor.ts`:
```typescript
async function runInvariantCheck() {
  // ... existing invariant check

  // Comment out to disable:
  // await StuckClientDetector.detectAndLog();
}
```

Endpoint will still work, just no automatic alerts.

---

## Integration with Monitoring Tools

### Pipe to External Alerting
```bash
# Example: Send to Slack via webhook
npm run dev 2>&1 | grep "STUCK_CLIENT_DETECTED" | \
  while read line; do
    curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK \
      -H 'Content-Type: application/json' \
      -d "{\"text\": \"$line\"}"
  done
```

### CloudWatch Logs (AWS)
Logs are already structured for parsing. Create CloudWatch filter:
```
Pattern: STUCK_CLIENT_DETECTED
Metric: StuckClientCount
Alarm: > 0 HIGH severity in 5 minutes
```

### Datadog (If Using)
```javascript
// Add to RuntimeMonitor.ts
import { datadogLogs } from '@datadog/browser-logs';

// In detectAndLog():
datadogLogs.logger.warn('STUCK_CLIENT_DETECTED', {
  clientId: client.clientId,
  severity: client.severity,
  // ... other fields
});
```

---

## Support

**Documentation:**
- `STUCK_CLIENT_DETECTION.md` - Full guide
- `STUCK_CLIENT_EXAMPLE_OUTPUT.md` - Real examples
- `STUCK_CLIENT_IMPLEMENTATION_SUMMARY.md` - Technical details

**Quick Help:**
```bash
# See threshold definitions
cat apps/backend/src/services/StuckClientDetector.ts | grep "STUCK_THRESHOLDS" -A 50

# See current stuck clients
curl http://localhost:3001/api/admin/stuck-clients

# See only critical
curl http://localhost:3001/api/admin/stuck-clients?severity=HIGH
```

---

**Setup Time:** ~5 minutes
**Learning Curve:** Minimal (one endpoint to remember)
**Maintenance:** Zero (runs automatically)
