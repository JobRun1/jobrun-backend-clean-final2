# 🚨 NUCLEAR ALERT KILL SWITCH - DEPLOYMENT

**OBJECTIVE**: Stop ALL ops alerts immediately with ZERO dependencies

---

## ✅ STEP 1: KILL SWITCH CODE ADDED

**File**: `apps/backend/src/services/AlertService.ts`
**Lines**: 135-149 (FIRST thing checked in sendCriticalAlert)

**Behavior**:
- Checks `process.env.ALERTS_DISABLED`
- If `"true"` → ALL alerts suppressed instantly
- NO database checks
- NO schema checks
- NO conditions
- NO exceptions

**TypeScript**: ✅ COMPILES CLEAN

---

## ⚡ STEP 2: ACTIVATE KILL SWITCH (DO THIS NOW)

### Option A: Railway Dashboard (FASTEST - NO DEPLOYMENT NEEDED)

1. Go to: https://railway.app/project/[your-project]
2. Click your backend service
3. Go to "Variables" tab
4. Click "New Variable"
5. Add:
   ```
   Name: ALERTS_DISABLED
   Value: true
   ```
6. Railway will auto-restart (30 seconds)

**NO BUILD REQUIRED. NO DEPLOY REQUIRED. Takes effect in 30 seconds.**

---

### Option B: Local .env File (If not using Railway)

Edit `apps/backend/.env`:

```bash
# Add this line at the TOP of the file:
ALERTS_DISABLED=true
```

Then restart:
```bash
npm run build
npm run start
```

---

### Option C: PM2 Environment Variable

```bash
pm2 restart jobrun-backend --update-env --env ALERTS_DISABLED=true
```

---

### Option D: Docker Environment Variable

```bash
docker stop jobrun-backend
docker run -d \
  --name jobrun-backend \
  -e ALERTS_DISABLED=true \
  [your other docker args]
```

---

## ✅ STEP 3: VERIFY KILL SWITCH ACTIVE

**Watch logs for**:

```
🚨 [KILL_SWITCH] ALL ALERTS DISABLED VIA ALERTS_DISABLED=true
```

**This message appears EVERY TIME an alert attempts to fire.**

**You should NOT see**:
- ❌ `[ALERT] SMS sent successfully`
- ❌ `[ALERT_SUPPRESSED] Phase 5 schema...` (kill switch runs BEFORE this)
- ❌ Any Twilio SIDs

---

## ✅ STEP 4: VERIFY ZERO SMS

**Wait 15 minutes.**

**Check**:
- [ ] Founder phone receives ZERO alert SMS
- [ ] Logs show `[KILL_SWITCH]` messages (if alerts attempted)
- [ ] NO `[ALERT] SMS sent` messages
- [ ] Backend continues running normally

---

## ✅ STEP 5: CONFIRM OR INVESTIGATE

### If Alerts STOPPED ✅

**Success!** The kill switch is working.

**What to do**:
- Leave `ALERTS_DISABLED=true` active
- Wait for Phase 5 migration to be deployed
- After migration: Change to `ALERTS_DISABLED=false`
- Remove kill switch code when stable

---

### If Alerts CONTINUE ❌

**This means alerts are NOT coming from AlertService.sendCriticalAlert()**

**Possible sources**:

1. **Different alert system**:
   ```bash
   # Search for other Twilio message sends:
   grep -r "client.messages.create" apps/backend/src/
   grep -r "twilio" apps/backend/src/ | grep -v AlertService
   ```

2. **Scheduled job bypassing AlertService**:
   ```bash
   # Check for cron jobs, scheduled tasks:
   grep -r "schedule" apps/backend/src/
   grep -r "setInterval" apps/backend/src/
   ```

3. **External alerting service**:
   - Check if you have PagerDuty, Opsgenie, etc.
   - Check if Railway/hosting platform has built-in alerts

**Report back which alternative sender is active.**

---

## 🔧 TROUBLESHOOTING

### Kill Switch Log Not Appearing

**Problem**: No `[KILL_SWITCH]` messages in logs

**Diagnosis**:
1. Environment variable not set
2. Process not restarted
3. Wrong environment (dev vs prod)

**Fix**:
```bash
# Railway:
# Check Variables tab - verify ALERTS_DISABLED=true exists

# Local:
# Check .env file:
cat apps/backend/.env | grep ALERTS_DISABLED

# Verify it's loaded at runtime:
# Add to index.ts temporarily:
console.log("ALERTS_DISABLED:", process.env.ALERTS_DISABLED);
```

---

### Kill Switch Active But Alerts Still Fire

**Problem**: `[KILL_SWITCH]` appears but SMS still sent

**This is IMPOSSIBLE** - the kill switch returns BEFORE any alert logic runs.

**Likely explanation**:
- Alerts coming from a different code path
- Multiple backend instances (one without kill switch)
- Cached/old code still running

**Investigation**:
```bash
# Check all running node processes:
ps aux | grep node

# Check Railway deployments:
# Verify only ONE deployment is "Active"

# Nuclear option - kill ALL node processes:
pkill -9 node
npm run start
```

---

### Wrong Environment Variable Value

**Problem**: Set to anything other than exactly `"true"`

**Check**:
```javascript
// These will NOT trigger kill switch:
ALERTS_DISABLED=True   // ❌ Wrong case
ALERTS_DISABLED=1      // ❌ Not string "true"
ALERTS_DISABLED=yes    // ❌ Not "true"

// Only this works:
ALERTS_DISABLED=true   // ✅ Correct
```

---

## 📊 VERIFICATION CHECKLIST

- [ ] Environment variable `ALERTS_DISABLED=true` set
- [ ] Backend process restarted (Railway auto-restarts)
- [ ] Logs show `[KILL_SWITCH]` messages (when alerts attempt)
- [ ] NO `[ALERT] SMS sent` messages for 15+ minutes
- [ ] Founder phone receives ZERO alerts for 15+ minutes
- [ ] Backend continues processing normal requests

---

## 🎯 TIMELINE

| Time | Action | Expected Result |
|------|--------|-----------------|
| T+0 | Set ALERTS_DISABLED=true | Variable saved |
| T+30s | Railway auto-restart | New env var loaded |
| T+1min | First alert attempt | `[KILL_SWITCH]` log appears |
| T+15min | Verification | No SMS for 15 minutes |

---

## 🔴 WHAT IF NOTHING WORKS

**Last resort options**:

### Option 1: Remove Twilio credentials
```bash
# In Railway dashboard or .env:
# Comment out or delete:
# TWILIO_AUTH_TOKEN=...

# Backend will start but alerts will fail
```

### Option 2: Replace Twilio number with invalid
```bash
# In Railway dashboard or .env:
TWILIO_OPS_NUMBER=+15555555555  # Invalid number

# SMS will be rejected by Twilio
```

### Option 3: Contact Twilio support
- Temporarily disable outbound SMS on your account
- This is a nuclear option (affects ALL Twilio messaging)

---

## ✅ SUCCESS CRITERIA

**You are successful when**:

1. ✅ `ALERTS_DISABLED=true` is set in environment
2. ✅ Backend restarted and loaded new env var
3. ✅ Logs show `[KILL_SWITCH]` messages
4. ✅ NO SMS sent for 15+ minutes
5. ✅ Founder phone completely quiet

**If ALL criteria met**: Kill switch is working perfectly.

**If ANY criteria fails**: See troubleshooting section.

---

## 🔓 TO RE-ENABLE ALERTS (LATER)

When Phase 5 migration is deployed and you want alerts back:

```bash
# Railway dashboard:
# Change ALERTS_DISABLED from "true" to "false"
# OR delete the variable entirely

# Local .env:
# Change to:
ALERTS_DISABLED=false
# OR delete the line

# Restart:
npm run build && npm run start
```

---

**YOUR NEXT ACTION**: Set `ALERTS_DISABLED=true` in Railway dashboard NOW

This takes 10 seconds and requires NO deployment.

Alerts will stop within 60 seconds.
