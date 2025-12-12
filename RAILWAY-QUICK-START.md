# Railway Quick Start - 5 Minute Repair

## Problem
Backend compiles but fails at runtime:
- "Default client not found: default-client"
- Empty database
- Missing configuration

## Solution (3 Steps)

### Step 1: Set Environment Variables in Railway

Go to Railway → Your Backend Service → Variables tab:

```bash
DEFAULT_CLIENT_ID=default-client
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_actual_auth_token
TWILIO_NUMBER=+15555551234
OPENAI_API_KEY=sk-...
JWT_SECRET=your_secure_random_32_char_string
FRONTEND_URL=https://your-dashboard.railway.app
NODE_ENV=production
```

**Critical**: `DEFAULT_CLIENT_ID` must be exactly `default-client`

### Step 2: Run Migrations in Railway Shell

```bash
# In Railway: Backend Service → Shell button (top right)

npx prisma migrate deploy --schema=/app/prisma/schema.prisma
npx prisma generate --schema=/app/prisma/schema.prisma
```

Expected: `✓ Applied 5 migrations`

### Step 3: Seed Database (Run Locally)

```bash
cd apps/backend

# Copy Railway DATABASE_URL from Railway Variables tab
export DATABASE_URL="postgresql://postgres:xxx@shortline.proxy.rlwy.net:45631/railway"

# Set your Twilio number
export TWILIO_NUMBER="+15555551234"

# Optional: Custom booking URL
export BOOKING_URL="https://calendly.com/your-link"

# Run seed
npx ts-node scripts/railway-seed.ts
```

Expected output:
```
✅ RAILWAY PRODUCTION SEED COMPLETE
```

## Verification

### Check Backend Logs (Railway)

Look for:
```
✅ All required environment variables present
✅ Backend listening on 0.0.0.0:3001
```

### Test Twilio Webhook

Send SMS to your Twilio number:
```
"Hi, I need help with plumbing"
```

Expected response:
- Booking link sent
- Railway logs show AI pipeline execution
- No errors

## Troubleshooting

| Error | Fix |
|-------|-----|
| "Default client not found" | Run Step 3 again |
| "TWILIO_NUMBER undefined" | Set in Railway Variables |
| "Database connection failed" | Check DATABASE_URL |
| "Prisma schema mismatch" | Run migrations (Step 2) |

## Success Indicators

- ✅ Backend starts without errors
- ✅ Test SMS triggers AI response
- ✅ Railway logs show pipeline execution
- ✅ Dashboard shows client data

## Full Documentation

See `RAILWAY-REPAIR-PLAN.md` for complete details.

---

**Total Time**: ~5 minutes
**Difficulty**: Easy
**Prerequisites**: Railway CLI access, local Node.js
