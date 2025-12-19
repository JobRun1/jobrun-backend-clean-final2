# STEP 2: RUNTIME CONTRACT ENFORCEMENT

**Status:** COMPLETE
**Definition:** If JobRun is running, it must also be CORRECT. Uptime without correctness is failure.

---

## ────────────────────────────────
## SECTION 1 — HEALTH CHECK ENDPOINT
## ────────────────────────────────

### Implementation

**Location:** `apps/backend/src/index.ts:185-204`

**Endpoint:** `GET /api/health`

### What It Validates

1. **DEFAULT_CLIENT_ID** env var exists
2. **Default client** exists in database
3. **Client settings** exist for default client
4. **metadata.bookingUrl** exists and is a valid URL
5. **DEFAULT_CLIENT_ID** matches database record

### Response Format

#### Healthy (HTTP 200)

```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T08:30:00.000Z",
  "invariants": {
    "defaultClientExists": true,
    "clientSettingsExists": true,
    "bookingUrlValid": true,
    "envClientIdMatches": true
  }
}
```

#### Unhealthy (HTTP 503)

```json
{
  "status": "unhealthy",
  "timestamp": "2025-01-15T08:30:00.000Z",
  "violations": [
    {
      "invariant": "DEFAULT_CLIENT_EXISTS",
      "expected": "Client with id='default-client' exists",
      "actual": "null",
      "severity": "CRITICAL"
    }
  ],
  "invariants": {
    "defaultClientExists": false,
    "clientSettingsExists": false,
    "bookingUrlValid": false,
    "envClientIdMatches": false
  }
}
```

### Wiring

The health check is wired into the Express app at startup:

**File:** `apps/backend/src/index.ts:185-204`

```typescript
app.get("/api/health", async (req, res) => {
  const result = await checkRuntimeInvariants();

  if (!result.healthy) {
    metrics.increment(MetricHealthCheckUnhealthy);
    return res.status(503).json({
      status: "unhealthy",
      timestamp: result.timestamp,
      violations: result.violations,
      invariants: result.invariants,
    });
  }

  metrics.increment(MetricHealthCheckHealthy);
  res.status(200).json({
    status: "healthy",
    timestamp: result.timestamp,
    invariants: result.invariants,
  });
});
```

### Railway Configuration

Configure Railway to use `/api/health` as a deploy gate:

1. Go to Railway project settings
2. Navigate to "Deployments" → "Health Checks"
3. Set health check path: `/api/health`
4. Set expected status code: `200`
5. Set initial delay: `10s` (allow time for DB connection)
6. Set interval: `30s`
7. Set timeout: `5s`
8. Set unhealthy threshold: `3` (3 consecutive failures)

**Result:** Railway will mark deployments as failed if health check returns 503.

---

## ──────────────────────────────────────
## SECTION 2 — RUNTIME INVARIANT MONITOR
## ──────────────────────────────────────

### Implementation

**Location:** `apps/backend/src/services/RuntimeMonitor.ts`

### Behavior

- **Production only** (skipped in development)
- **Runs every 5 minutes**
- **Re-checks ALL bootstrap invariants**
- **Logs violations** with explicit ❌ markers
- **Does NOT crash the app**

### Startup Integration

**Location:** `apps/backend/src/index.ts:245`

```typescript
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend listening on 0.0.0.0:${PORT}`);

  // Metrics: Startup successful
  metrics.increment(MetricStartupSuccess);

  // Start runtime invariant monitor (production only)
  startRuntimeMonitor();
});
```

### Example Log Output (Healthy)

```
✅ Runtime invariant check passed at 2025-01-15T08:35:00.000Z
```

### Example Log Output (Unhealthy)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 RUNTIME INVARIANT MONITOR ALERT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Timestamp: 2025-01-15T08:35:00.000Z

❌ INVARIANT VIOLATIONS DETECTED:

[1] CLIENT_SETTINGS_EXISTS (CRITICAL)
    Expected: ClientSettings for clientId='default-client' exists
    Actual:   null

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Action Required: Runtime invariants are violated.
This deployment is UNHEALTHY and may fail health checks.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔔 ALERT: Runtime invariant violations detected
   Violation count: 1
   Integrate external alerting here (PagerDuty, Slack, etc)
```

### Alert Placeholder

**Location:** `apps/backend/src/services/RuntimeMonitor.ts:47-51`

The `emitAlert()` function is a placeholder for external alerting integration. In production, integrate with:
- PagerDuty
- Slack webhooks
- OpsGenie
- Custom alerting service

---

## ────────────────────────────────────
## SECTION 3 — STARTUP CONTRACT LOGS
## ────────────────────────────────────

### Required Log Lines

Every startup MUST log:

1. **Environment validation**
2. **Bootstrap data validation**
3. **Invariant monitoring started**

### Example Startup Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STARTUP CONTRACT: Environment Validation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Environment variables validated
   DATABASE_URL: configured
   TWILIO_ACCOUNT_SID: configured
   TWILIO_AUTH_TOKEN: configured
   TWILIO_NUMBER: +1234567890
   DEFAULT_CLIENT_ID: default-client
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STARTUP CONTRACT: Bootstrap Data Validation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Validating bootstrap for client: default-client

✅ Default client exists
   ID: default-client
   Business: JobRun Demo
✅ Client settings exist
✅ Booking URL valid: https://example.com/book

✅ BOOTSTRAP VALIDATION COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 JobRun Backend Starting
Port: 3001
✅ Backend listening on 0.0.0.0:3001
🔍 Starting runtime invariant monitor...
   Check interval: 5 minutes
✅ Runtime invariant monitor started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STARTUP COMPLETE — METRICS INITIALIZED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Contract Violations

If startup fails, logs MUST show:

```
❌ STARTUP CONTRACT VIOLATION: CLIENT_SETTINGS_MISSING
   Client ID: default-client
   ClientSettings row does not exist
   Bootstrap migration may have failed
   Refusing to start without client settings
```

Then the process exits with code 1.

---

## ───────────────────────────────
## SECTION 4 — MINIMAL METRICS
## ───────────────────────────────

### Implementation

**Location:** `apps/backend/src/services/Metrics.ts`

### Metrics Defined

#### Startup Metrics (Counters)

```typescript
startup.success                   // Server started successfully
startup.failure                   // Server failed to start
startup.bootstrap.success         // Bootstrap validation passed
startup.bootstrap.failure         // Bootstrap validation failed
```

#### Twilio Webhook Metrics (Counters)

```typescript
twilio.inbound.sms               // Inbound SMS received
twilio.inbound.voice             // Inbound voice call received
twilio.callstatus                // Call status webhook received
twilio.webhook.error             // Webhook handler error
```

#### AI Pipeline Metrics (Counters + Timings)

```typescript
ai.pipeline.success              // AI pipeline completed successfully
ai.pipeline.failure              // AI pipeline failed
ai.pipeline.duration             // AI pipeline execution time (ms)
```

#### Health Check Metrics (Counters)

```typescript
health.check.healthy             // Health check returned 200
health.check.unhealthy           // Health check returned 503
```

### Metric Increments

#### Startup

**Location:** `apps/backend/src/index.ts:242,153,161`

```typescript
metrics.increment(MetricStartupSuccess);
metrics.increment(MetricBootstrapValidationSuccess);
metrics.increment(MetricBootstrapValidationFailure);
```

#### Health Check

**Location:** `apps/backend/src/index.ts:189,198`

```typescript
metrics.increment(MetricHealthCheckUnhealthy);  // On 503
metrics.increment(MetricHealthCheckHealthy);    // On 200
```

#### Twilio Webhooks

**Location:** `apps/backend/src/twilio/handlers/smsInbound.ts:19,60`

```typescript
metrics.increment(MetricTwilioInboundSMS);      // SMS received
metrics.increment(MetricTwilioWebhookError);    // On error
```

**Location:** `apps/backend/src/twilio/handlers/voiceInbound.ts:17,58`

```typescript
metrics.increment(MetricTwilioInboundVoice);    // Voice call received
metrics.increment(MetricTwilioWebhookError);    // On error
```

### Example Metrics Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 METRICS SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Timestamp: 2025-01-15T12:00:00.000Z

Counters:
  health.check.healthy: 48
  health.check.unhealthy: 0
  startup.bootstrap.success: 1
  startup.success: 1
  twilio.inbound.sms: 127
  twilio.inbound.voice: 8
  twilio.webhook.error: 2

Timings:
  ai.pipeline.duration: 15 calls, avg 234.56ms, total 3518ms

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Usage

```typescript
// Increment a counter
metrics.increment('custom.event');

// Record a timing
metrics.timing('operation.duration', 123);

// Get snapshot
const snapshot = metrics.getSnapshot();

// Log summary
metrics.logSummary();
```

---

## ────────────────────────────────────
## SECTION 5 — DAILY EXTERNAL HEALTH PROBE
## ────────────────────────────────────

### Implementation

**Location:** `.github/workflows/health-check.yml`

### Workflow Details

- **Name:** `Production Health Check`
- **Trigger:** Daily at 8 AM UTC (`cron: '0 8 * * *'`)
- **Manual trigger:** Enabled via `workflow_dispatch`
- **Timeout:** 5 minutes
- **Runner:** `ubuntu-latest`

### What It Does

1. Calls `${{ secrets.PRODUCTION_URL }}/api/health`
2. Checks HTTP status code is `200`
3. Validates response JSON contains `status: "healthy"`
4. Fails loudly if unhealthy
5. Provides next-steps guidance on failure

### Required Secret

**GitHub Repository Secret:**

- **Name:** `PRODUCTION_URL`
- **Value:** `https://your-production-domain.railway.app` (no trailing slash)

**How to set:**

1. Go to GitHub repository
2. Settings → Secrets and variables → Actions
3. New repository secret
4. Name: `PRODUCTION_URL`
5. Value: Your Railway production URL

### Example Success Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DAILY HEALTH CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target: https://production.railway.app/api/health
Time: 2025-01-15 08:00:00 UTC

HTTP Status: 200

Response Body:
{
  "status": "healthy",
  "timestamp": "2025-01-15T08:00:00.000Z",
  "invariants": {
    "defaultClientExists": true,
    "clientSettingsExists": true,
    "bookingUrlValid": true,
    "envClientIdMatches": true
  }
}

✅ HEALTH CHECK PASSED
All invariants satisfied
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Example Failure Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DAILY HEALTH CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target: https://production.railway.app/api/health
Time: 2025-01-15 08:00:00 UTC

HTTP Status: 503

Response Body:
{
  "status": "unhealthy",
  "timestamp": "2025-01-15T08:00:00.000Z",
  "violations": [...]
}

❌ HEALTH CHECK FAILED
Expected: HTTP 200
Received: HTTP 503

PRODUCTION IS UNHEALTHY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 ALERT: Production health check failed
This workflow has detected that production is unhealthy.
Immediate investigation required.

Next steps:
1. Check Railway logs
2. Review recent deployments
3. Verify bootstrap data integrity
4. Check database connectivity
```

### Why This Matters

**Protects against:**

- Silent degradation (database corruption, lost records)
- Deployment regressions that pass tests but break production
- Environmental drift (env vars changed, secrets rotated incorrectly)
- Data deletion (accidental or malicious)

**Detection window:** 24 hours maximum (runs daily)

---

## ────────────────────────────────────
## SECTION 6 — EXIT CRITERIA (STEP 2 DONE)
## ────────────────────────────────────

### Checklist

All items must be ✅ before moving to STEP 3.

#### 1. Health Check Blocks Bad Deploys

- [ ] `/api/health` returns HTTP 200 when healthy
- [ ] `/api/health` returns HTTP 503 when unhealthy
- [ ] Response includes structured `violations` array
- [ ] Railway health check is configured to use `/api/health`
- [ ] Railway health check blocks deploys that return 503

**Verification:**

```bash
curl -v https://production.railway.app/api/health
```

Expected: HTTP 200 with `status: "healthy"`

#### 2. Runtime Drift Detected Within 5 Minutes

- [ ] Runtime monitor starts on production deployment
- [ ] Monitor runs every 5 minutes
- [ ] Monitor logs violations with ❌ markers
- [ ] Monitor does NOT crash the app
- [ ] Logs are visible in Railway dashboard

**Verification:**

Check Railway logs for:

```
🔍 Starting runtime invariant monitor...
   Check interval: 5 minutes
✅ Runtime invariant monitor started
```

Then wait 5 minutes and verify:

```
✅ Runtime invariant check passed at [timestamp]
```

#### 3. Logs Prove Correctness

- [ ] Startup logs show "STARTUP CONTRACT: Environment Validation"
- [ ] Startup logs show "STARTUP CONTRACT: Bootstrap Data Validation"
- [ ] Startup logs show "STARTUP COMPLETE — METRICS INITIALIZED"
- [ ] Logs include explicit ✅ for each validated invariant
- [ ] Logs include explicit ❌ for violations (if any)

**Verification:**

Check Railway startup logs for all required contract log sections.

#### 4. Metrics Exist

- [ ] Metrics service is instantiated
- [ ] `startup.success` is incremented on startup
- [ ] `startup.bootstrap.success` is incremented after validation
- [ ] `health.check.healthy` / `health.check.unhealthy` incremented on `/api/health` calls
- [ ] `twilio.inbound.sms` incremented on SMS webhooks
- [ ] `twilio.inbound.voice` incremented on voice webhooks
- [ ] `twilio.webhook.error` incremented on webhook errors

**Verification:**

Add a metrics summary endpoint or log metrics periodically:

```typescript
// Add to index.ts after server starts
setInterval(() => {
  metrics.logSummary();
}, 60 * 60 * 1000); // Log metrics every hour
```

Then check logs for `📊 METRICS SUMMARY`.

#### 5. Daily Probe Is Live

- [ ] `.github/workflows/health-check.yml` exists
- [ ] `PRODUCTION_URL` secret is set in GitHub
- [ ] Workflow runs daily at 8 AM UTC
- [ ] Workflow can be triggered manually
- [ ] Workflow fails if production returns 503
- [ ] Workflow output shows structured health check results

**Verification:**

1. Go to GitHub Actions tab
2. Run "Production Health Check" workflow manually
3. Verify it passes (green check)
4. Check workflow output includes "✅ HEALTH CHECK PASSED"

---

## Additional Files Modified

### Core Implementation

- `apps/backend/src/services/HealthCheck.ts` (NEW) - Invariant validation logic
- `apps/backend/src/services/RuntimeMonitor.ts` (NEW) - Background monitor
- `apps/backend/src/services/Metrics.ts` (NEW) - Metrics service
- `apps/backend/src/index.ts` (MODIFIED) - Integrated health check, monitor, metrics
- `apps/backend/src/twilio/handlers/smsInbound.ts` (MODIFIED) - Added metrics
- `apps/backend/src/twilio/handlers/voiceInbound.ts` (MODIFIED) - Added metrics

### CI/CD

- `.github/workflows/health-check.yml` (NEW) - Daily health probe

---

## Testing the Implementation

### Test 1: Health Check (Healthy)

```bash
curl -v http://localhost:3001/api/health
```

Expected:
- HTTP 200
- JSON with `status: "healthy"`

### Test 2: Health Check (Unhealthy)

Temporarily break bootstrap data:

```sql
DELETE FROM "ClientSettings" WHERE "clientId" = 'default-client';
```

Then:

```bash
curl -v http://localhost:3001/api/health
```

Expected:
- HTTP 503
- JSON with `status: "unhealthy"` and `violations` array

**IMPORTANT:** Restore data after test:

```sql
-- Restore using migration or manual insert
```

### Test 3: Runtime Monitor

1. Start app in production mode: `NODE_ENV=production npm start`
2. Wait 5 minutes
3. Check logs for: `✅ Runtime invariant check passed at [timestamp]`

### Test 4: Metrics

1. Start app
2. Call `/api/health` multiple times
3. Trigger Twilio webhooks (or simulate)
4. Add code to log metrics:

```typescript
setTimeout(() => {
  metrics.logSummary();
}, 30000); // After 30 seconds
```

5. Verify metrics are logged

### Test 5: Daily Probe

1. Set `PRODUCTION_URL` secret in GitHub
2. Manually trigger workflow from Actions tab
3. Verify it passes
4. Check output shows health check details

---

## STEP 2 DESIGN COMPLETE — READY FOR IMPLEMENTATION

**Implementation Status:** ✅ COMPLETE

All sections implemented:
- ✅ SECTION 1: Health Check Endpoint
- ✅ SECTION 2: Runtime Invariant Monitor
- ✅ SECTION 3: Startup Contract Logs
- ✅ SECTION 4: Minimal Metrics
- ✅ SECTION 5: Daily External Health Probe
- ✅ SECTION 6: Exit Criteria Documented

**Next Steps:**

1. Deploy to Railway
2. Verify all exit criteria
3. Monitor for 24 hours
4. Confirm runtime monitor logs every 5 minutes
5. Confirm daily health probe succeeds
6. Proceed to STEP 3 only after ALL criteria met
