# 🚨 FORENSIC LOGGING DEPLOYED - ALERT SPAM TRACKER

**STATUS**: Code ready - awaiting deployment
**OBJECTIVE**: Identify EXACTLY which code path is sending alert spam

---

## ✅ WHAT WAS ADDED

**Stack trace logging added to ALL 7 Twilio message sending locations**:

1. **src/services/AlertService.ts:270-271**
   Context: Primary ops alert service (has kill switch + schema guard)

2. **src/services/NotificationService.ts:143-144**
   Context: General notification service

3. **src/services/AdminCommandService.ts:146-147**
   Context: Admin SMS commands ("TEXT" command)

4. **src/twilio/client.ts:37-38**
   Context: Generic SMS sending utility function

5. **src/utils/onboardingSms.ts:53-54**
   Context: Onboarding welcome SMS

6. **src/routes/twilio.ts:241-242**
   Context: Onboarding success message (S9_TEST_CALL completion)

7. **src/routes/twilio.ts:271-272**
   Context: Test call reminder (when user answered instead of missed)

---

## 🔍 WHAT EACH LOCATION LOGS

**Every single Twilio send now logs**:

```
🚨🚨🚨 TWILIO SEND EXECUTED FROM: /path/to/file.ts
🚨 STACK TRACE: Error
    at sendCriticalAlert (AlertService.ts:271:35)
    at RuntimeMonitor.checkStuckClients (RuntimeMonitor.ts:123:45)
    at Timeout._onTimeout (RuntimeMonitor.ts:89:12)
    ...
```

**This tells you**:
- Which file sent the SMS
- Which function called it
- Full call stack showing how execution got there

---

## ⚡ NEXT STEPS - DEPLOY NOW

### 1. Build

```bash
cd apps/backend
npm run build
```

### 2. Deploy (Choose your method)

**Railway (Recommended)**:
```bash
git add .
git commit -m "forensic: add stack trace logging to all Twilio sends"
git push origin main
```

**Direct/PM2/Docker**: See DEPLOYMENT_VERIFICATION.md

---

## 🔍 WAIT FOR ONE ALERT

**After deployment**:

1. **Watch logs continuously**
2. **Wait for the NEXT ops alert SMS** (happens every ~5 minutes)
3. **Look for the 🚨🚨🚨 log** that appears

---

## 📊 WHAT YOU'LL SEE

**Example - If AlertService is the source**:

```
🚨🚨🚨 TWILIO SEND EXECUTED FROM: /app/dist/services/AlertService.js
🚨 STACK TRACE: Error
    at AlertService.sendCriticalAlert (AlertService.js:271:35)
    at RuntimeMonitor.checkStuckClients (RuntimeMonitor.js:145:42)
    at Timeout._onTimeout (RuntimeMonitor.js:98:10)
```

**This tells you**:
- Source: AlertService.ts line 271
- Called from: RuntimeMonitor.checkStuckClients line 145
- Triggered by: setTimeout in RuntimeMonitor line 98

---

## ✅ AFTER YOU IDENTIFY THE SOURCE

**Report back which file and function is sending the spam.**

**Then we'll**:
1. Route that sender through AlertService (so kill switch works)
2. OR add the same kill switch to that specific location
3. OR delete the legacy sender entirely (if it shouldn't be running)

---

## 🚨 IMPORTANT NOTES

- **Do NOT remove the logging yet** - we need ONE alert to fire with it
- **All guards remain active** (kill switch + schema check in AlertService)
- **SMS will still send** - we're NOT suppressing, just identifying
- **After identification** - we'll kill at source and remove forensic logs

---

## 🔧 TROUBLESHOOTING

### No 🚨🚨🚨 logs appear

**Problem**: Alerts not going through Twilio at all

**Possible causes**:
- Alerts coming from external service (PagerDuty, Opsgenie, etc.)
- Railway/hosting platform has built-in alerting
- Webhook firing directly (not through backend)

**Solution**: Check hosting platform alert settings

---

### Multiple 🚨🚨🚨 logs appear

**Problem**: Multiple code paths sending alerts

**Solution**: We'll need to add kill switch to ALL identified locations

---

### Logs show but can't identify source

**Problem**: Stack trace unclear or truncated

**Solution**:
```bash
# Increase stack trace limit in index.ts:
Error.stackTraceLimit = 50;
```

---

## 📈 SUCCESS CRITERIA

After deployment, within 10 minutes you should:

- [ ] See exactly ONE 🚨🚨🚨 log when alert fires
- [ ] Stack trace shows full call path
- [ ] Can identify: which file, which function, which line
- [ ] Can determine what triggered it (timer? event? webhook?)

---

**CURRENT STATUS**: Code ready, TypeScript compiles cleanly

**YOUR ACTION**: Deploy using commands above, then monitor logs for ONE alert cycle

---

**See Also**:
- NUCLEAR_DEPLOYMENT.md - Kill switch deployment (already in code)
- DEPLOYMENT_VERIFICATION.md - Deployment verification steps
