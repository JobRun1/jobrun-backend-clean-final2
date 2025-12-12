# Production Seed Script Guide

## Overview

The `seed-production.ts` script creates the default client and settings required for Railway production deployment.

## Features

✅ **Idempotent** - Safe to run multiple times (uses upsert)
✅ **Validates E.164 phone numbers** - Ensures Twilio compatibility
✅ **Comprehensive verification** - Confirms all records created correctly
✅ **Detailed logging** - Clear visual indicators for each step
✅ **Error handling** - Exits with code 1 on failure
✅ **Environment-based** - Configure via environment variables

## Quick Start

### 1. Set Environment Variables

```bash
# Required
export DATABASE_URL="postgresql://postgres:xxx@shortline.proxy.rlwy.net:xxx/railway"
export TWILIO_NUMBER="+15555551234"

# Optional (with defaults)
export URGENT_ALERT_NUMBER="+15555551234"  # Defaults to TWILIO_NUMBER
export BOOKING_URL="https://calendly.com/your-link"  # Defaults to demo URL
export BUSINESS_NAME="JobRun Test Client"  # Defaults to "JobRun Test Client"
```

### 2. Run the Script

```bash
cd apps/backend

# Using npm script (recommended)
npm run seed:prod

# Or directly with ts-node
npx ts-node prisma/seed-production.ts
```

## Expected Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌱 JOBRUN PRODUCTION SEED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Started: 2025-12-11T12:00:00.000Z

📋 Configuration loaded:
   Client ID: default-client
   Business Name: JobRun Test Client
   Twilio Number: +15555551234
   Alert Number: +15555551234
   Booking URL: https://calendly.com/demo

🔍 Validating configuration...

   ✓ TWILIO_NUMBER: +15555551234 (valid E.164 format)
   ✓ URGENT_ALERT_NUMBER: +15555551234 (valid E.164 format)
   ✓ Booking URL: https://calendly.com/demo (valid)
   ✓ Client ID: default-client
   ✓ Business Name: JobRun Test Client

✅ All configuration validated

🏢 Creating/updating default client...

   ✓ Client ID: default-client
   ✓ Business Name: JobRun Test Client
   ✓ Twilio Number: +15555551234
   ✓ Alert Number: +15555551234
   ✓ Region: US
   ✓ Timezone: America/New_York
   ✓ Created At: 2025-12-11T12:00:00.000Z
   ✓ Updated At: 2025-12-11T12:00:00.000Z

⚙️  Creating/updating client settings...

   ℹ️  No existing settings - creating new...
   ✓ Settings ID: clxxxxxxxxxxxxxxxxxxxxxxxx
   ✓ Client ID: default-client
   ✓ Business Name: JobRun Test Client
   ✓ Services: Home Services, Repairs, Maintenance
   ✓ Phone: +15555551234
   ✓ Email: contact@jobrun.com
   ✓ Metadata:
      - Booking URL: https://calendly.com/demo
      - Booking Enabled: true
      - Alert Number: +15555551234
      - Onboarding Complete: true
      - AI Pipeline: true

🔍 Verifying database records...

   ✓ Client exists: default-client
      - Business: JobRun Test Client
      - Twilio: +15555551234
      - Customers: 0
      - Leads: 0
      - Messages: 0
   ✓ ClientSettings exists: clxxxxxxxxxxxxxxxxxxxxxxxx
      - Client ID: default-client
      - Business: JobRun Test Client
   ✓ Metadata structure:
      ✓ bookingUrl: https://calendly.com/demo
      ✓ booking_link_enabled: true
      ✓ urgent_alert_number: +15555551234
      ✓ onboarding_complete: true

   ✓ Query test passed:
      - ID: default-client
      - Business: JobRun Test Client
      - Twilio: +15555551234
      - Booking URL: https://calendly.com/demo

✅ All verifications passed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SEEDING COMPLETED SUCCESSFULLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Summary:
   Client ID: default-client
   Business: JobRun Test Client
   Twilio: +15555551234
   Alert: +15555551234
   Settings ID: clxxxxxxxxxxxxxxxxxxxxxxxx
   Booking URL: https://calendly.com/demo

🚀 Next Steps:
   1. Verify Railway environment variables:
      DEFAULT_CLIENT_ID="default-client"
      TWILIO_NUMBER="+15555551234"

   2. Check backend logs for startup:
      ✅ All required environment variables present
      ✅ Backend listening on 0.0.0.0:3001

   3. Test Twilio webhook:
      Send SMS to +15555551234
      Message: "Hi, I need help"
      Expected: AI pipeline executes successfully

   4. Monitor Railway logs:
      Look for: 🤖 INBOUND SMS AI PIPELINE START
      Should see: ✅ INBOUND SMS PIPELINE COMPLETE

Completed: 2025-12-11T12:00:05.000Z
```

## What Gets Created

### 1. Client Record

```typescript
{
  id: "default-client",                    // Fixed ID
  businessName: "JobRun Test Client",
  region: "US",
  phoneNumber: "+15555551234",            // Alert number
  twilioNumber: "+15555551234",           // Twilio SMS number
  timezone: "America/New_York",
  demoToolsVisible: true,
  demoClient: false,
  businessHours: {
    monday: { open: "09:00", close: "17:00" },
    // ... rest of week
  }
}
```

### 2. ClientSettings Record

```typescript
{
  clientId: "default-client",
  businessName: "JobRun Test Client",
  services: "Home Services, Repairs, Maintenance",
  availability: "Monday-Friday 9am-5pm",
  pricing: "Service call: $95, Hourly rate: $150",
  phoneNumber: "+15555551234",
  email: "contact@jobrun.com",
  website: "https://jobrun.com",
  serviceArea: "Local service area",
  metadata: {
    bookingUrl: "https://calendly.com/demo",
    urgent_alert_number: "+15555551234",
    booking_link_enabled: true,
    onboarding_complete: true,
    system_version: "v1.0.0",
    ai_pipeline_enabled: true
  }
}
```

## Validation Rules

### Phone Number (E.164 Format)

✅ Valid:
- `+15555551234` (11 digits, starts with +1)
- `+14155551234`
- `+12125551234`

❌ Invalid:
- `5555551234` (missing +1)
- `+1555555123` (only 10 digits)
- `+155555512345` (12 digits)
- `1-555-555-1234` (contains dashes)

### Booking URL

✅ Valid:
- `https://calendly.com/your-link`
- `https://acuityscheduling.com/schedule.php?owner=12345`
- `http://localhost:3000/book` (for local testing)

❌ Invalid:
- `calendly.com/link` (missing protocol)
- `ftp://calendly.com/link` (invalid protocol)
- `not-a-url` (not a URL)

## Troubleshooting

### Error: "TWILIO_NUMBER must be in E.164 format"

**Cause**: Phone number doesn't match +1XXXXXXXXXX pattern

**Fix**:
```bash
# Correct format
export TWILIO_NUMBER="+15555551234"

# NOT these
export TWILIO_NUMBER="5555551234"      # ❌ Missing +1
export TWILIO_NUMBER="+1-555-555-1234" # ❌ Contains dashes
```

### Error: "Database connection failed"

**Cause**: DATABASE_URL not set or invalid

**Fix**:
```bash
# Get URL from Railway Variables tab
export DATABASE_URL="postgresql://postgres:PASSWORD@HOST:PORT/railway"

# Test connection
npx prisma db execute --stdin <<< "SELECT 1;"
```

### Error: "Booking URL is invalid"

**Cause**: URL format incorrect

**Fix**:
```bash
# Must include https:// or http://
export BOOKING_URL="https://calendly.com/your-link"
```

### Script runs but database empty

**Cause**: DATABASE_URL pointing to wrong database

**Fix**:
```bash
# Verify you're using Railway production URL, not local
echo $DATABASE_URL  # Should contain "railway.app" or "rlwy.net"
```

## Running on Railway

### Option 1: Railway Shell (Not Recommended)

```bash
# In Railway shell
cd /app
npx ts-node prisma/seed-production.ts
```

**Note**: Environment variables already set in Railway

### Option 2: Run Locally (Recommended)

```bash
# Set Railway DATABASE_URL
export DATABASE_URL="postgresql://..."

# Run from local machine
cd apps/backend
npm run seed:prod
```

**Advantage**: Better error messages, faster execution

## Safety Features

1. **Upsert Operations**: Won't create duplicates
2. **Validation Before Insert**: Catches errors early
3. **Verification After Insert**: Confirms success
4. **Exit Code 1 on Error**: Fails CI/CD pipelines if seeding fails
5. **Detailed Logging**: Easy to debug issues

## When to Run

✅ **Run this script**:
- First Railway deployment
- After database reset
- When default client deleted
- When metadata.bookingUrl needs updating

❌ **Don't run this script**:
- For demo/development data (use `npm run seed` instead)
- On local database repeatedly (unless testing)
- Without setting DATABASE_URL first

## Related Files

- `seed.ts` - Demo data seed (creates 3 clients with fake data)
- `seed-production.ts` - Production seed (creates default client only)
- `schema.prisma` - Database schema
- `migrations/` - Database migrations

## Support

If you encounter issues:

1. Check environment variables are set correctly
2. Verify database is accessible
3. Run migrations: `npx prisma migrate deploy`
4. Check Railway logs for specific errors
5. See `RAILWAY-REPAIR-PLAN.md` for comprehensive troubleshooting

---

**Version**: 1.0.0
**Last Updated**: 2025-12-11
**Status**: Production Ready
