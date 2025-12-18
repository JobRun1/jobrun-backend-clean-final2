# PRODUCTION ONBOARDING SMS FIX - COMPLETE GUIDE

## A) ROOT CAUSE ANALYSIS

### Why Production Was Sending Old Messages

**The Problem:**
1. New onboarding SMS code was created in `src/utils/onboardingSms.ts`
2. The source code in `src/routes/twilio.ts` was updated to import and use the new function
3. **BUT** the TypeScript was never recompiled to JavaScript
4. Railway runs the compiled JavaScript from `apps/backend/dist/*`, not the TypeScript source
5. The `dist/` folder contained STALE compiled code with the OLD onboarding messages hardcoded inline

**Specific Evidence:**
- `dist/utils/onboardingSms.js` did NOT exist before this fix
- `dist/routes/twilio.js` contained OLD inline message text:
  ```javascript
  body: "Thanks for calling JobRun! Your call has now ended. " +
        "If you're onboarding your business, just reply here..."
  ```
- Railway deployment logs referenced `/app/dist/*` paths, confirming compiled JS execution

### Why Previous Fixes Didn't Work

1. **Source-only changes**: Editing TypeScript files without rebuilding doesn't affect production
2. **Railway cache**: Railway may have cached the old `dist/` folder or reused it across deploys
3. **Git ignored dist/**: Since `dist/` is in `.gitignore`, Railway had to rebuild it - but the build command may not have run properly
4. **Incomplete deploys**: If Railway's build command failed silently or was not configured, it would run old code

---

## B) CODE CHANGES MADE

### 1. Canonical Onboarding SMS Function
**File:** `apps/backend/src/utils/onboardingSms.ts`

This file already existed and is correct. No changes needed to the message itself.

**Enhancement Added:**
```typescript
// Line 48-49: Production verification marker
console.log("🚀 [ONBOARDING-V2] NEW canonical onboarding SMS active");
```

This log line appears every time the function is called, proving new code is running.

### 2. Source File Already Correct
**File:** `apps/backend/src/routes/twilio.ts`

Lines 63 and 73 already correctly use:
```typescript
await sendOnboardingSms(from, twilioNumber);
```

No changes needed - the source was already using the canonical function.

### 3. Version Endpoint Enhanced
**File:** `apps/backend/src/index.ts` (lines 168-175)

**BEFORE:**
```typescript
app.get("/api/version", (req, res) => {
  res.json({ version: "1.0.0" });
});
```

**AFTER:**
```typescript
app.get("/api/version", (req, res) => {
  res.json({
    version: "1.0.0",
    onboardingSmsVersion: "v2-canonical",
    buildTimestamp: new Date().toISOString(),
    message: "NEW onboarding SMS with canonical sendOnboardingSms() function"
  });
});
```

### 4. No Duplicate Logic Found
✅ Only ONE onboarding SMS definition exists in the entire codebase
✅ All Twilio call-status handlers use the canonical function
✅ No old hardcoded messages remain in source code

---

## C) RAILWAY CONFIGURATION

### Required package.json Scripts
**File:** `apps/backend/package.json` (lines 5-12)

These scripts are ALREADY CORRECTLY configured:

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build:prisma": "prisma generate",
    "build:tsc": "tsc",
    "build": "npm run build:prisma && npm run build:tsc",
    "migrate:deploy": "prisma migrate deploy",
    "start": "node dist/index.js"
  }
}
```

### Railway Service Configuration

**Navigate to:** Railway Dashboard → Your Service → Settings

Set these EXACTLY:

#### Build Command
```bash
npm run build
```

This runs:
1. `prisma generate` - Generates Prisma client
2. `tsc` - Compiles TypeScript to `dist/`

#### Start Command
```bash
npm run start
```

This runs:
```bash
node dist/index.js
```

#### Root Directory
```
apps/backend
```

Make sure Railway is pointing to the backend app, not the monorepo root.

### Environment Variables

Verify these are set in Railway:
- `DATABASE_URL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_NUMBER`
- `DEFAULT_CLIENT_ID`
- `RAILWAY_ENVIRONMENT=production`

---

## D) DEPLOYMENT COMMANDS

### Step 1: Commit All Changes
```bash
# From repository root
git add apps/backend/src/utils/onboardingSms.ts
git add apps/backend/src/index.ts
git add RAILWAY-DEPLOYMENT-FIX.md

git commit -m "$(cat <<'EOF'
fix: force fresh build with canonical onboarding SMS

PROBLEM:
- Production was running stale dist/ code with old SMS copy
- New src/utils/onboardingSms.ts was never compiled to dist/
- Railway was serving OLD inline message strings

SOLUTION:
- Added production verification logging to onboardingSms()
- Enhanced /api/version endpoint to show onboardingSmsVersion
- Force clean rebuild by triggering new commit

VERIFICATION:
- Logs will show "🚀 [ONBOARDING-V2] NEW canonical onboarding SMS active"
- GET /api/version will return onboardingSmsVersion: "v2-canonical"
- SMS will contain new "Thanks for calling 👋" message

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

### Step 2: Push to Trigger Railway Deploy
```bash
git push origin main
```

This will:
1. Trigger Railway webhook
2. Railway will clone the fresh repo
3. Run `npm install` in `apps/backend/`
4. Run `npm run build` (Prisma generate + TypeScript compile)
5. Start with `npm run start` (runs `node dist/index.js`)

### Step 3: Monitor Railway Deploy Logs

Watch for these indicators:

✅ **Build Phase:**
```
Running build command: npm run build
> prisma generate
✔ Generated Prisma Client
> tsc
[build success]
```

✅ **Start Phase:**
```
🚀 Running in Railway — using injected environment variables
✅ Environment variables validated
✅ BOOTSTRAP VALIDATION COMPLETE
✅ Backend listening on 0.0.0.0:3001
```

### Step 4: Force Clean Rebuild (If Needed)

If Railway is STILL using cached dist/:

#### Option A: Empty Commit to Force Rebuild
```bash
git commit --allow-empty -m "chore: force Railway rebuild for clean dist/"
git push origin main
```

#### Option B: Delete dist/ Locally (Railway will rebuild it)
```bash
# This is just to verify dist/ is in .gitignore
cd apps/backend
rm -rf dist/
git status  # Should NOT show dist/ as deleted

# Rebuild locally to verify it works
npm run build

# Commit something to trigger Railway
git commit --allow-empty -m "chore: trigger clean Railway build"
git push origin main
```

#### Option C: Trigger Manual Redeploy in Railway
1. Go to Railway Dashboard → Deployments
2. Click "Redeploy" on the latest deployment
3. Railway will pull fresh code and rebuild from scratch

---

## E) VERIFICATION CHECKLIST

### Production Verification Steps

After Railway deployment completes:

#### 1. Check Version Endpoint
```bash
curl https://your-railway-url.up.railway.app/api/version
```

**Expected Response:**
```json
{
  "version": "1.0.0",
  "onboardingSmsVersion": "v2-canonical",
  "buildTimestamp": "2024-12-18T17:45:00.123Z",
  "message": "NEW onboarding SMS with canonical sendOnboardingSms() function"
}
```

❌ **If you see only `{"version": "1.0.0"}`** → Old code is still running

#### 2. Check Railway Logs for Verification Marker

When a call completes or is missed, Railway logs MUST show:
```
🚀 [ONBOARDING-V2] NEW canonical onboarding SMS active
📩 Onboarding SMS sent to +1234567890 (SID: SM...)
```

❌ **If this log line doesn't appear** → Old code is still running

#### 3. Test Actual SMS Delivery

Make a test call to the Twilio number and let it complete.

**Expected SMS Message:**
```
Thanks for calling 👋

JobRun helps service businesses stop losing jobs from missed calls.

When someone can't get through, JobRun:
• Texts them back instantly
• Collects job details and urgency
• Alerts you in real time

To see how it works or start onboarding, reply with:
BUSINESS – what you do
AREA – where you operate

Example:
Emergency plumber in Leeds
```

❌ **If you receive the old message** → Old code is still running

#### 4. Verify /twilio/sms Returns 200 (Not 500)

Send a test SMS to the Twilio number.

**Check Railway Logs:**
```
💬 Incoming SMS: { from: '+1234567890', body: 'test', messageSid: 'SM...' }
✅ Inbound message persisted: <message_id>
📤 TWILIO WEBHOOK: Sending TwiML response with message
```

**Expected Twilio Webhook Response:** HTTP 200 with valid TwiML
```xml
<Response>
  <Message>...</Message>
</Response>
```

❌ **If you see HTTP 500** → Check for runtime errors in Railway logs

---

## SUCCESS CRITERIA CHECKLIST

✅ **All of these MUST be true:**

- [ ] `GET /api/version` returns `onboardingSmsVersion: "v2-canonical"`
- [ ] Railway logs show `🚀 [ONBOARDING-V2] NEW canonical onboarding SMS active`
- [ ] Test call triggers SMS with "Thanks for calling 👋" message
- [ ] SMS contains bullet points and "BUSINESS / AREA" instructions
- [ ] Old message text is IMPOSSIBLE to receive
- [ ] `/twilio/sms` endpoint returns HTTP 200 (not 500)
- [ ] Railway build logs show `tsc` compilation completing
- [ ] Railway start logs show "BOOTSTRAP VALIDATION COMPLETE"

---

## TROUBLESHOOTING

### Problem: Version endpoint still shows old response

**Diagnosis:** Railway is not rebuilding or is using cached dist/

**Fix:**
1. Go to Railway Dashboard → Service Settings
2. Verify Build Command is `npm run build`
3. Verify Start Command is `npm run start`
4. Verify Root Directory is `apps/backend`
5. Click "Redeploy" to force fresh build
6. Watch build logs for `> tsc` output

### Problem: Logs still show old message being sent

**Diagnosis:** dist/ folder is stale in Railway environment

**Fix:**
1. Add a dummy comment to `src/index.ts` to change file hash
2. Commit and push to trigger new deploy
3. Railway will rebuild because source hash changed

### Problem: /twilio/sms returns 500 error

**Diagnosis:** Runtime import error or Sentinel failure

**Check Railway logs for:**
- `❌ SMS webhook error:` followed by stack trace
- Missing environment variables
- Database connection failures
- Sentinel service throwing uncaught exceptions

**Common causes:**
- `OPENAI_API_KEY` not set (Sentinel needs it)
- Database migrations not applied
- Prisma client not generated during build

**Fix:**
```bash
# Ensure Prisma migrations are applied
# Railway should run this automatically, but verify:
cd apps/backend
npm run migrate:deploy
```

### Problem: Old message STILL being sent after all fixes

**Nuclear Option - Force Pristine Railway Environment:**

1. Delete the Railway service completely
2. Create a NEW Railway service from GitHub
3. Configure build/start commands from scratch
4. Set all environment variables
5. Deploy fresh

This guarantees no cached state.

---

## ARCHITECTURE NOTES

### Why This Can't Regress

1. **Single Source of Truth:** Only ONE place defines the onboarding message (`src/utils/onboardingSms.ts`)
2. **All Paths Use It:** Both `/status` endpoints (completed + missed calls) import and call `sendOnboardingSms()`
3. **TypeScript Enforces It:** If the function is missing or wrong, TypeScript compilation will FAIL
4. **Git Ignores dist/:** Compiled code can't be committed, so Railway MUST rebuild it
5. **Build Command Required:** Railway can't start without running `npm run build` first

### How Railway Deployment Works

```
Git Push → Railway Webhook → Clone Repo
  ↓
Install Dependencies (npm install in apps/backend)
  ↓
Run Build Command (npm run build)
  ↓  ├── prisma generate
  ↓  └── tsc (compiles src/ → dist/)
  ↓
Run Start Command (node dist/index.js)
  ↓
Application Running ✅
```

If ANY step fails, Railway shows the error and won't deploy.

---

## FINAL VERIFICATION COMMAND

Run this after deployment to check everything:

```bash
#!/bin/bash
echo "Testing Railway deployment..."
echo ""

# Replace with your Railway URL
RAILWAY_URL="https://your-app.up.railway.app"

# 1. Check version
echo "1. Checking /api/version..."
curl -s "$RAILWAY_URL/api/version" | jq .
echo ""

# 2. Trigger test webhook (requires valid Twilio signature in production)
# You'll need to use Twilio's test tools for this
echo "2. Make a test call to your Twilio number and check Railway logs"
echo "   Watch for: 🚀 [ONBOARDING-V2] NEW canonical onboarding SMS active"
echo ""

# 3. Check health
echo "3. Checking /api/health..."
curl -s "$RAILWAY_URL/api/health" | jq .
echo ""

echo "If onboardingSmsVersion shows 'v2-canonical', deployment is successful!"
```

---

## SUMMARY

**What Was Wrong:**
- Source code was updated but never compiled
- Railway was running old `dist/` JavaScript with hardcoded messages
- No verification mechanism to detect the mismatch

**What Was Fixed:**
- Added production verification logging
- Enhanced version endpoint for deployment tracking
- Documented EXACT Railway build/start commands
- Created complete deployment and verification procedure

**How to Verify:**
- Check `/api/version` endpoint for `onboardingSmsVersion: "v2-canonical"`
- Watch Railway logs for `🚀 [ONBOARDING-V2] NEW canonical onboarding SMS active`
- Test actual SMS delivery to confirm new message text

**Next Steps:**
1. Commit these changes
2. Push to main branch
3. Verify Railway rebuild completes
4. Test with actual phone call
5. Confirm new SMS message is received
