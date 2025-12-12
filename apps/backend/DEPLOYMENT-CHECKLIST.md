# Railway Deployment Checklist - JobRun Backend

## Pre-Deployment

### 1. Code Readiness
- [x] Prisma schema finalized
- [x] All migrations created
- [x] TypeScript compiles without errors
- [x] Environment variables documented
- [x] Seed script created

### 2. Railway Setup
- [ ] PostgreSQL plugin added to project
- [ ] Backend service created
- [ ] Environment variables configured
- [ ] Build logs show success

### 3. Environment Variables Required

**Critical** (backend will crash without these):
```
DEFAULT_CLIENT_ID=default-client
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_NUMBER=+15555551234
DATABASE_URL=postgresql://... (auto-set by Railway)
```

**Important** (features won't work without these):
```
OPENAI_API_KEY=sk-...
JWT_SECRET=min_32_character_random_string
FRONTEND_URL=https://your-dashboard.railway.app
NODE_ENV=production
```

**Optional**:
```
URGENT_ALERT_NUMBER=+15555551234 (defaults to TWILIO_NUMBER)
BOOKING_URL=https://calendly.com/... (defaults to placeholder)
PORT=3001 (auto-set by Railway)
```

## Deployment Steps

### Step 1: Deploy Backend to Railway

```bash
# Railway auto-deploys from Git
# Or manually:
railway up
```

**Expected**:
- ✅ Build successful
- ❌ Runtime error (database empty)

### Step 2: Run Migrations

**In Railway Shell** (Backend Service → Shell):
```bash
npx prisma migrate deploy --schema=/app/prisma/schema.prisma
npx prisma generate --schema=/app/prisma/schema.prisma
```

**Expected**:
```
✓ Applied migration: 20251204230957_init
✓ Applied migration: 20251205200600_add_named_unique_constraints
✓ Applied migration: 20251209000000_add_impersonation_and_customer_states
✓ Applied migration: 20251210000000_add_demo_client_field
✓ Applied migration: 20251210120000_add_twilio_number
All migrations have been successfully applied.
```

### Step 3: Seed Production Database

**Run locally** (points to Railway database):
```bash
cd apps/backend

# Get DATABASE_URL from Railway Variables tab
export DATABASE_URL="postgresql://postgres:xxx@shortline.proxy.rlwy.net:xxx/railway"
export TWILIO_NUMBER="+15555551234"
export BOOKING_URL="https://calendly.com/your-link"

npx ts-node scripts/railway-seed.ts
```

**Expected**:
```
✅ RAILWAY PRODUCTION SEED COMPLETE
```

### Step 4: Verify Backend Health

**Check logs** (Railway → Backend Service → Deploy Logs):
```
✅ All required environment variables present
✅ Backend listening on 0.0.0.0:3001
```

**Test health endpoint**:
```bash
curl https://your-backend.railway.app/api/health
```

**Expected**:
```json
{"status":"ok","timestamp":"2025-12-11T..."}
```

### Step 5: Configure Twilio Webhooks

**In Twilio Console**:

1. **Phone Numbers** → Your Number → Configure

2. **Messaging**:
   - Webhook URL: `https://your-backend.railway.app/twilio/sms`
   - Method: `POST`

3. **Voice**:
   - Webhook URL: `https://your-backend.railway.app/twilio/voice`
   - Method: `POST`

4. **Call Status Webhook**:
   - URL: `https://your-backend.railway.app/twilio/status`
   - Method: `POST`

### Step 6: Test AI Pipeline

**Send test SMS** to your Twilio number:
```
"Hi, I need help with plumbing"
```

**Expected in Railway logs**:
```
💬 Incoming SMS: { from: '+1...', body: 'Hi, I need help with plumbing' }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 INBOUND SMS AI PIPELINE START
Client: JobRun Test Client
...
1️⃣ SENTINEL: Running safety guard...
✅ SENTINEL: Message passed safety checks
2️⃣ VAULT: Get or create lead...
3️⃣ DIAL: Classifying intent...
4️⃣ FLOW: Extracting entities...
5️⃣ RUNE: Deciding next action...
✅ RUNE: Action = SEND_BOOKING_LINK
7️⃣ LYRA: Generating reply...
✅ INBOUND SMS PIPELINE COMPLETE
```

**Expected SMS reply**:
```
Thanks for reaching out! Here's where you can book:
https://calendly.com/...

What kind of plumbing work do you need?
```

## Post-Deployment Verification

### Database Verification

**Run query** (Railway PostgreSQL shell):
```sql
SELECT
  c.id,
  c."businessName",
  c."twilioNumber",
  cs.metadata->>'bookingUrl' as booking_url,
  COUNT(cu.id) as customer_count,
  COUNT(l.id) as lead_count
FROM clients c
LEFT JOIN client_settings cs ON cs."clientId" = c.id
LEFT JOIN customers cu ON cu."clientId" = c.id
LEFT JOIN leads l ON l."clientId" = c.id
WHERE c.id = 'default-client'
GROUP BY c.id, c."businessName", c."twilioNumber", cs.metadata;
```

**Expected**:
```
id             | businessName        | twilioNumber  | booking_url            | customer_count | lead_count
---------------|---------------------|---------------|------------------------|----------------|------------
default-client | JobRun Test Client  | +15555551234  | https://calendly.com/  | 0              | 0
```

### Environment Check

**Verify all env vars set** (Railway Variables tab):
```
✓ DATABASE_URL
✓ DEFAULT_CLIENT_ID
✓ TWILIO_ACCOUNT_SID
✓ TWILIO_AUTH_TOKEN
✓ TWILIO_NUMBER
✓ OPENAI_API_KEY
✓ JWT_SECRET
✓ FRONTEND_URL
✓ NODE_ENV
```

### Feature Testing

- [ ] **Inbound SMS**: Send test message → AI responds
- [ ] **Voice call**: Call Twilio number → TwiML plays → Post-call SMS sent
- [ ] **Urgent flow**: Send "Emergency flooding!" → Alert notification sent
- [ ] **Booking link**: Verify booking URL in response
- [ ] **Dashboard**: Visit admin dashboard → See client data
- [ ] **Messages**: Check messages appear in dashboard
- [ ] **Leads**: Verify lead created with correct state

## Troubleshooting

### Backend won't start

**Check**:
1. Environment variables set correctly
2. DATABASE_URL is valid
3. Build logs for errors

**Fix**:
```bash
# In Railway: Variables tab
# Verify all required vars present
# Redeploy if needed
```

### "Default client not found"

**Check**:
```bash
# Run seed script again
export DATABASE_URL="..."
npx ts-node scripts/railway-seed.ts
```

### Twilio webhook fails

**Check**:
1. Webhook URL correct in Twilio console
2. Backend is running (check Railway logs)
3. Endpoint returns 200 OK

**Debug**:
```bash
# View webhook logs in Twilio console
# Check Railway logs for errors
```

### AI pipeline fails

**Check**:
1. OPENAI_API_KEY is valid
2. ClientSettings.metadata.bookingUrl exists
3. Railway logs for specific error

**Fix**:
```sql
-- Update booking URL if needed
UPDATE client_settings
SET metadata = metadata || '{"bookingUrl":"https://calendly.com/..."}'::jsonb
WHERE "clientId" = 'default-client';
```

## Monitoring

### Key Metrics

- **Health endpoint**: `GET /api/health` → 200 OK
- **Response time**: < 2 seconds for SMS processing
- **Error rate**: < 1% of requests
- **Database connections**: Monitor in Railway Metrics

### Logs to Watch

**Success pattern**:
```
💬 Incoming SMS
🤖 INBOUND SMS AI PIPELINE START
✅ SENTINEL: Message passed
✅ INBOUND SMS PIPELINE COMPLETE
```

**Error pattern**:
```
❌ PIPELINE ERROR:
❌ Default client not found
❌ Database connection failed
```

## Rollback Procedure

If deployment fails:

1. **Check Railway logs** for specific error
2. **Verify environment variables**
3. **Run migrations** if schema mismatch
4. **Re-seed database** if client missing
5. **Redeploy** from last known good commit

```bash
# Rollback to previous deployment
railway rollback
```

## Success Criteria

- [x] Backend builds successfully
- [x] Migrations applied (5 total)
- [x] Default client created
- [x] Environment variables set
- [x] Health endpoint returns 200
- [ ] Test SMS triggers AI pipeline
- [ ] AI response received
- [ ] Dashboard shows client data
- [ ] No errors in Railway logs
- [ ] Twilio webhooks configured

## Next Steps After Deployment

1. **Add real clients**: Use onboarding flow or admin dashboard
2. **Configure custom booking URLs**: Update ClientSettings
3. **Set up monitoring**: Railway metrics + alerts
4. **Test emergency flow**: Send urgent message
5. **Load test**: Send multiple concurrent messages
6. **Security audit**: Verify JWT secrets, API keys secure
7. **Documentation**: Update API docs with production URLs

---

**Deployment Time**: ~15 minutes
**Last Updated**: 2025-12-11
**Status**: Production Ready
