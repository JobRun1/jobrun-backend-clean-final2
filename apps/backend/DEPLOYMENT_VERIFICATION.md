# 🚨 EMERGENCY DEPLOYMENT VERIFICATION

**STATUS**: Code ready - awaiting deployment

---

## ⚡ STEP 2: BUILD + RESTART (DO THIS NOW)

### Commands to Run

```bash
cd apps/backend

# 1. Build the application
npm run build

# 2. Deploy using YOUR production method:
```

**Choose ONE deployment method**:

### Option A: Railway (Recommended)
```bash
git add .
git commit -m "emergency: deploy Phase 5 alert suppression guard"
git push origin main

# Railway will auto-deploy and restart
# Watch Railway logs at: https://railway.app/project/[your-project]/deployments
```

### Option B: PM2 (If using PM2)
```bash
# Copy built files to server (if needed)
# Then restart:
pm2 restart jobrun-backend

# OR restart all:
pm2 restart all

# Watch logs:
pm2 logs jobrun-backend
```

### Option C: Docker (If containerized)
```bash
# Rebuild image
docker build -t jobrun-backend .

# Stop old container
docker stop jobrun-backend

# Start new container
docker run -d --name jobrun-backend [your-docker-args]

# Watch logs:
docker logs -f jobrun-backend
```

### Option D: Direct Node (Development/Testing)
```bash
# Kill existing process
pkill -f "node.*index"

# Start new process
npm run start

# OR with logging:
npm run start 2>&1 | tee deployment.log
```

---

## ✅ STEP 3: VERIFY RUNTIME (CRITICAL)

**Watch production logs immediately after restart.**

### What to Look For

**REQUIRED - Must appear within 30 seconds**:

```
═══════════════════════════════════════════
🔧 ENVIRONMENT LOADED
═══════════════════════════════════════════
🚨 ALERT GUARD VERSION: PHASE5_EMERGENCY_GUARD_ACTIVE
🚨 AlertService emergency suppression is ENABLED
🚨 Alerts will be suppressed until Phase 5 migration deployed
═══════════════════════════════════════════
```

### ❌ If You DON'T See This

**Problem**: Old code is still running

**Solutions**:

1. **Verify process actually restarted**:
   ```bash
   # Check process start time
   ps aux | grep node
   # Look at START time column - should be recent
   ```

2. **Check deployment status** (Railway):
   - Go to Railway dashboard
   - Check "Deployments" tab
   - Verify latest deployment is "Active"
   - Check deployment logs

3. **Verify build succeeded**:
   ```bash
   ls -la apps/backend/dist/
   # Should show recent timestamps
   ```

4. **Force restart**:
   ```bash
   # Railway:
   railway restart

   # PM2:
   pm2 delete jobrun-backend
   pm2 start npm --name jobrun-backend -- start

   # Direct:
   pkill -9 -f "node.*index"
   npm run start
   ```

---

## ✅ STEP 4: VERIFY SUPPRESSION

### Wait for Alert Cycle (or Trigger One)

**Alert cycles happen approximately every 5 minutes** based on your description.

### Expected Behavior

**Within 10 minutes, you MUST see**:

```
[ALERT_SUPPRESSED] Phase 5 schema not deployed — all ops alerts paused until migration applied. Run: npx prisma migrate deploy
```

### Expected ABSENCE

**You should NOT see**:

```
❌ [ALERT] SMS sent successfully (sid=SM...)
❌ [ALERT] Delivered via SMS
❌ Any Twilio message SIDs
```

### Verification Checklist

- [ ] Startup log visible (🚨 ALERT GUARD VERSION...)
- [ ] Within 10 min: `[ALERT_SUPPRESSED]` message appears
- [ ] Within 10 min: NO `[ALERT] SMS sent` messages
- [ ] Founder phone stops receiving alerts

---

## ✅ STEP 5: CLEANUP (AFTER CONFIRMATION ONLY)

**DO NOT do this until alerts have stopped for 10+ minutes.**

### Remove Temporary Startup Log

```bash
cd apps/backend
```

Then I'll remove lines 16-23 from `src/index.ts`:

```typescript
// DELETE THESE LINES:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMERGENCY DEPLOYMENT VERIFICATION (REMOVE AFTER CONFIRMATION)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("🚨 ALERT GUARD VERSION: PHASE5_EMERGENCY_GUARD_ACTIVE");
console.log("🚨 AlertService emergency suppression is ENABLED");
console.log("🚨 Alerts will be suppressed until Phase 5 migration deployed");
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**LEAVE THE EMERGENCY GUARD IN AlertService.ts** - that stays until Phase 5 migration is applied.

---

## 🚨 TROUBLESHOOTING

### Alerts Still Firing After Deployment

**Symptom**: SMS alerts continue despite deployment

**Diagnosis**:
1. Check if startup log appears → If NO: old code running
2. Check if suppression log appears → If NO: guard not executing
3. Check if SMS logs appear → If YES: guard bypassed somehow

**Solutions**:

**A. Old code still running**:
```bash
# Nuclear option - kill all node processes
pkill -9 node

# Verify no node processes running
ps aux | grep node

# Start fresh
cd apps/backend
npm run build
npm run start
```

**B. Guard not executing**:
```bash
# Verify AlertService.ts has the guard
grep -n "PHASE5_EMERGENCY_GUARD" src/services/AlertService.ts
# Should return line numbers

# Verify build included it
grep -r "PHASE5_EMERGENCY_GUARD" dist/
# Should find it in compiled code
```

**C. Database is reachable** (guard passes when it shouldn't):
```bash
# Check if Phase 5 schema accidentally deployed
# Connect to your DB and run:
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'alert_logs'
  AND column_name = 'acknowledged_at';

# If returns 1 row: Phase 5 is already deployed (guard will pass)
# If returns 0 rows: Guard should suppress (check logs)
```

---

## 📊 SUCCESS CRITERIA

Deployment is successful when ALL of these are true:

1. ✅ Startup log `🚨 ALERT GUARD VERSION...` visible in logs
2. ✅ Within 10 minutes: `[ALERT_SUPPRESSED]` appears
3. ✅ Within 10 minutes: NO `[ALERT] SMS sent` messages
4. ✅ Founder phone stops receiving alert SMS
5. ✅ Backend continues running (no crashes)
6. ✅ Other functionality unaffected (onboarding, bookings, etc.)

**If ANY criteria fails**: See troubleshooting section above.

---

## 🎯 TIMELINE

| Time | Action | Expected Result |
|------|--------|-----------------|
| T+0 | Deploy + restart | Startup log appears |
| T+5min | First alert cycle | `[ALERT_SUPPRESSED]` appears |
| T+10min | Verification | No SMS for 10 minutes |
| T+10min | Cleanup | Remove startup log (optional) |

---

## 📞 WHAT TO WATCH

**Production Logs** (continuous monitoring):

```bash
# Railway:
railway logs --follow

# PM2:
pm2 logs jobrun-backend --lines 100

# Docker:
docker logs -f jobrun-backend

# Direct:
tail -f logs/production.log
```

**Look for these log patterns**:

```
✅ GOOD:
[timestamp] 🚨 ALERT GUARD VERSION: PHASE5_EMERGENCY_GUARD_ACTIVE
[timestamp] [ALERT_SUPPRESSED] Phase 5 schema not deployed...

❌ BAD:
[timestamp] [ALERT] SMS sent successfully
[timestamp] Delivered alert via SMS (sid=SM...)
```

---

## 🔴 EMERGENCY CONTACT

If deployment fails catastrophically:

1. **Rollback immediately**:
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Emergency disable via environment variable**:
   ```bash
   # Add to .env or Railway dashboard:
   ALERTS_DISABLED=true

   # Then add to AlertService.ts sendCriticalAlert():
   if (process.env.ALERTS_DISABLED === 'true') {
     return { success: false, suppressed: true };
   }
   ```

3. **Nuclear option - disable Twilio**:
   - Remove TWILIO_AUTH_TOKEN from environment
   - Backend will start but alerts will fail silently

---

**YOU ARE ON STEP 2 NOW.**

**Run the build and deployment commands above, then proceed to STEP 3 verification.**

**DO NOT SKIP VERIFICATION - You must confirm the new code is running.**
