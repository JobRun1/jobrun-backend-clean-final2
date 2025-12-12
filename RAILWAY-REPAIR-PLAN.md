# Railway Repair Plan - JobRun Backend V1

## Problem Summary

- **Build Status**: ✅ Successful (Docker image built and deployed)
- **Runtime Status**: ❌ Failing
- **Root Cause**: Empty PostgreSQL database + missing default client configuration
- **Critical Errors**:
  - `"Default client not found: default-client"`
  - `"Client configuration error"`
  - Missing ClientSettings.metadata.bookingUrl

---

## Solution Overview

1. Run Prisma migrations on Railway database
2. Create default client with specific ID
3. Configure ClientSettings with booking URL metadata
4. Set environment variables correctly
5. Verify Twilio webhook configuration

---

## 🔧 PART 1: RUN THIS IN RAILWAY SHELL

### Step 1.1: Open Railway Shell

```bash
# In Railway dashboard:
# 1. Go to your backend service
# 2. Click "Deploy Logs" tab
# 3. Click "Shell" button (top right)
# 4. You'll get a terminal inside the running container
```

### Step 1.2: Check Database Connection

```bash
# Test database is accessible
npx prisma db execute --stdin <<< "SELECT 1;" --schema=/app/prisma/schema.prisma
```

**Expected Output:**
```
✓ Database connection successful
```

**If this fails:**
- Check DATABASE_URL is set correctly in Railway environment variables
- Verify PostgreSQL plugin is attached to service

### Step 1.3: Run Prisma Migrations

```bash
# Apply all pending migrations
npx prisma migrate deploy --schema=/app/prisma/schema.prisma
```

**Expected Output:**
```
5 migrations found
...
✓ Applied migration: 20251204230957_init
✓ Applied migration: 20251205200600_add_named_unique_constraints
✓ Applied migration: 20251209000000_add_impersonation_and_customer_states
✓ Applied migration: 20251210000000_add_demo_client_field
✓ Applied migration: 20251210120000_add_twilio_number
```

### Step 1.4: Generate Prisma Client

```bash
# Regenerate Prisma client for production
npx prisma generate --schema=/app/prisma/schema.prisma
```

**Expected Output:**
```
✓ Generated Prisma Client
```

### Step 1.5: Verify Schema Applied

```bash
# Check tables exist
npx prisma db execute --stdin --schema=/app/prisma/schema.prisma <<< "
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
"
```

**Expected Output:**
```
clients
client_settings
customers
leads
messages
conversations
bookings
...
```

---

## 🔧 PART 2: SET RAILWAY ENVIRONMENT VARIABLES

### Step 2.1: Go to Railway Variables Tab

In Railway dashboard:
1. Select your backend service
2. Click "Variables" tab
3. Add/update these variables:

### Step 2.2: Required Environment Variables

```bash
# Database (auto-set by Railway, verify it's present)
DATABASE_URL=postgresql://...

# Twilio Configuration (REPLACE WITH YOUR ACTUAL VALUES)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_actual_auth_token
TWILIO_NUMBER=+15555551234

# Default Client ID (CRITICAL - must match seed script)
DEFAULT_CLIENT_ID=default-client

# JWT Secret (generate secure random string)
JWT_SECRET=your_secure_random_string_min_32_chars

# Node Environment
NODE_ENV=production

# Frontend URL (for dashboard links in notifications)
FRONTEND_URL=https://your-dashboard-url.railway.app

# OpenAI API Key (for AI pipeline)
OPENAI_API_KEY=sk-...
```

### Step 2.3: Verify Variables Set

After setting, redeploy the service:
```bash
# Railway will auto-redeploy when env vars change
# Or manually trigger: Click "Deploy" → "Redeploy"
```

---

## 🔧 PART 3: SEED DEFAULT CLIENT (RUN LOCALLY)

### Option A: Using Railway Seed Script (Recommended)

Create this file locally: `apps/backend/scripts/railway-seed.ts`

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedRailwayProduction() {
  console.log("🌱 Seeding Railway Production Database...\n");

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. CREATE DEFAULT CLIENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const defaultClientId = "default-client";
  const twilioNumber = process.env.TWILIO_NUMBER || "+15555551234";
  const urgentAlertNumber = process.env.URGENT_ALERT_NUMBER || twilioNumber;

  console.log("🏢 Creating default client...");

  // Check if client already exists
  let client = await prisma.client.findUnique({
    where: { id: defaultClientId },
  });

  if (client) {
    console.log("⚠️  Default client already exists, updating...");
    client = await prisma.client.update({
      where: { id: defaultClientId },
      data: {
        businessName: "JobRun Test Client",
        region: "US",
        phoneNumber: urgentAlertNumber,
        twilioNumber: twilioNumber,
        timezone: "America/New_York",
        demoToolsVisible: true,
        demoClient: false,
      },
    });
  } else {
    console.log("✨ Creating new default client...");
    client = await prisma.client.create({
      data: {
        id: defaultClientId, // CRITICAL: Fixed ID
        businessName: "JobRun Test Client",
        region: "US",
        phoneNumber: urgentAlertNumber,
        twilioNumber: twilioNumber,
        timezone: "America/New_York",
        demoToolsVisible: true,
        demoClient: false,
        businessHours: {
          monday: { open: "09:00", close: "17:00" },
          tuesday: { open: "09:00", close: "17:00" },
          wednesday: { open: "09:00", close: "17:00" },
          thursday: { open: "09:00", close: "17:00" },
          friday: { open: "09:00", close: "17:00" },
          saturday: { closed: true },
          sunday: { closed: true },
        },
      },
    });
  }

  console.log(`✅ Client created: ${client.id}`);
  console.log(`   Business: ${client.businessName}`);
  console.log(`   Twilio: ${client.twilioNumber}`);
  console.log(`   Alert: ${client.phoneNumber}\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. CREATE CLIENT SETTINGS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log("⚙️  Creating client settings...");

  let settings = await prisma.clientSettings.findUnique({
    where: { clientId: defaultClientId },
  });

  const bookingUrl = process.env.BOOKING_URL || "https://calendly.com/jobrun-test";

  if (settings) {
    console.log("⚠️  Client settings already exist, updating...");
    settings = await prisma.clientSettings.update({
      where: { clientId: defaultClientId },
      data: {
        businessName: "JobRun Test Client",
        services: "Home Services, Repairs, Maintenance",
        availability: "Monday-Friday 9am-5pm",
        pricing: "Service call: $95, Hourly: $150",
        phoneNumber: urgentAlertNumber,
        email: "contact@jobrun.com",
        website: "https://jobrun.com",
        serviceArea: "Local area",
        metadata: {
          bookingUrl: bookingUrl,
          urgent_alert_number: urgentAlertNumber,
          booking_link_enabled: true,
          onboarding_complete: true,
        },
      },
    });
  } else {
    console.log("✨ Creating new client settings...");
    settings = await prisma.clientSettings.create({
      data: {
        clientId: defaultClientId,
        businessName: "JobRun Test Client",
        services: "Home Services, Repairs, Maintenance",
        availability: "Monday-Friday 9am-5pm",
        pricing: "Service call: $95, Hourly: $150",
        phoneNumber: urgentAlertNumber,
        email: "contact@jobrun.com",
        website: "https://jobrun.com",
        serviceArea: "Local area",
        metadata: {
          bookingUrl: bookingUrl,
          urgent_alert_number: urgentAlertNumber,
          booking_link_enabled: true,
          onboarding_complete: true,
        },
      },
    });
  }

  console.log(`✅ Client settings created`);
  console.log(`   Booking URL: ${bookingUrl}`);
  console.log(`   Alert Number: ${urgentAlertNumber}\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. SUMMARY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ RAILWAY PRODUCTION SEED COMPLETE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("📊 Summary:");
  console.log(`   Default Client ID: ${defaultClientId}`);
  console.log(`   Business Name: ${client.businessName}`);
  console.log(`   Twilio Number: ${client.twilioNumber}`);
  console.log(`   Alert Number: ${client.phoneNumber}`);
  console.log(`   Booking URL: ${bookingUrl}`);
  console.log();

  console.log("🚀 Next Steps:");
  console.log("   1. Verify backend logs show no errors");
  console.log("   2. Test Twilio webhook: Send SMS to your Twilio number");
  console.log("   3. Check Railway logs for AI pipeline execution");
  console.log("   4. Visit dashboard to verify client appears");
  console.log();
}

seedRailwayProduction()
  .catch((e) => {
    console.error("\n❌ Seeding failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Step 3.1: Run Seed Script Locally Against Railway DB

```bash
# From apps/backend directory
cd apps/backend

# Set DATABASE_URL to Railway production database
export DATABASE_URL="postgresql://postgres:xxxx@shortline.proxy.rlwy.net:45631/railway"

# Optional: Set custom values
export TWILIO_NUMBER="+15555551234"
export URGENT_ALERT_NUMBER="+15555551234"
export BOOKING_URL="https://calendly.com/your-booking-link"

# Run seed script
npx ts-node scripts/railway-seed.ts
```

**Expected Output:**
```
🌱 Seeding Railway Production Database...

🏢 Creating default client...
✨ Creating new default client...
✅ Client created: default-client
   Business: JobRun Test Client
   Twilio: +15555551234
   Alert: +15555551234

⚙️  Creating client settings...
✨ Creating new client settings...
✅ Client settings created
   Booking URL: https://calendly.com/your-booking-link
   Alert Number: +15555551234

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ RAILWAY PRODUCTION SEED COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Option B: Manual SQL Insert (If ts-node unavailable)

```sql
-- Run in Railway PostgreSQL shell

-- 1. Insert default client
INSERT INTO clients (
  id,
  "createdAt",
  "updatedAt",
  "businessName",
  region,
  "phoneNumber",
  "twilioNumber",
  timezone,
  "demoToolsVisible",
  "demoClient",
  "businessHours"
)
VALUES (
  'default-client',
  NOW(),
  NOW(),
  'JobRun Test Client',
  'US',
  '+15555551234',  -- Your personal number for alerts
  '+15555551234',  -- Your Twilio number
  'America/New_York',
  true,
  false,
  '{"monday":{"open":"09:00","close":"17:00"},"tuesday":{"open":"09:00","close":"17:00"},"wednesday":{"open":"09:00","close":"17:00"},"thursday":{"open":"09:00","close":"17:00"},"friday":{"open":"09:00","close":"17:00"},"saturday":{"closed":true},"sunday":{"closed":true}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  "updatedAt" = NOW(),
  "twilioNumber" = EXCLUDED."twilioNumber",
  "phoneNumber" = EXCLUDED."phoneNumber";

-- 2. Insert client settings
INSERT INTO client_settings (
  id,
  "createdAt",
  "updatedAt",
  "clientId",
  "businessName",
  services,
  availability,
  pricing,
  "phoneNumber",
  email,
  website,
  "serviceArea",
  metadata
)
VALUES (
  gen_random_uuid()::text,
  NOW(),
  NOW(),
  'default-client',
  'JobRun Test Client',
  'Home Services, Repairs, Maintenance',
  'Monday-Friday 9am-5pm',
  'Service call: $95, Hourly: $150',
  '+15555551234',
  'contact@jobrun.com',
  'https://jobrun.com',
  'Local area',
  '{"bookingUrl":"https://calendly.com/jobrun-test","urgent_alert_number":"+15555551234","booking_link_enabled":true,"onboarding_complete":true}'::jsonb
)
ON CONFLICT ("clientId") DO UPDATE SET
  "updatedAt" = NOW(),
  metadata = EXCLUDED.metadata;
```

---

## 🔍 PART 4: VERIFICATION

### Step 4.1: Check Backend Logs

```bash
# In Railway dashboard:
# 1. Go to backend service
# 2. Click "Deploy Logs"
# 3. Look for startup messages
```

**Expected Output:**
```
═══════════════════════════════════════════
🔧 ENVIRONMENT LOADED
═══════════════════════════════════════════
DATABASE_URL: ✅ OK
TWILIO_ACCOUNT_SID: ✅ ACxxxxxxxx...
TWILIO_AUTH_TOKEN: ✅ OK
TWILIO_NUMBER: ✅ +15555551234
DEFAULT_CLIENT_ID: ✅ default-client
═══════════════════════════════════════════
✅ All required environment variables present
🚀 JobRun Backend Starting
Port: 3001
✅ Backend listening on 0.0.0.0:3001
```

**If you see errors:**
- ❌ "DEFAULT_CLIENT_ID: ❌ MISSING" → Set environment variable in Railway
- ❌ "Database connection failed" → Check DATABASE_URL
- ❌ "Default client not found" → Run seed script again

### Step 4.2: Test Database Query

```bash
# In Railway shell
npx prisma db execute --stdin --schema=/app/prisma/schema.prisma <<< "
SELECT
  c.id,
  c.\"businessName\",
  c.\"twilioNumber\",
  cs.metadata->>'bookingUrl' as booking_url
FROM clients c
LEFT JOIN client_settings cs ON cs.\"clientId\" = c.id
WHERE c.id = 'default-client';
"
```

**Expected Output:**
```
id              | businessName        | twilioNumber   | booking_url
----------------|---------------------|----------------|-------------------
default-client  | JobRun Test Client  | +15555551234   | https://calendly.com/...
```

### Step 4.3: Test Twilio Webhook

```bash
# Send test SMS to your Twilio number
# You should see in Railway logs:

💬 Incoming SMS: { from: '+1234567890', body: 'test', messageSid: 'SM...' }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 INBOUND SMS AI PIPELINE START
Client: JobRun Test Client
Customer: +1234567890 (NEW)
Message: "test"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ SENTINEL: Running safety guard...
✅ SENTINEL: Message passed safety checks
2️⃣ VAULT: Get or create lead...
...
✅ INBOUND SMS PIPELINE COMPLETE
```

---

## ⚠️ FAILURE MODES AND FIXES

### Error: "Default client not found: default-client"

**Cause**: Client record doesn't exist in database

**Fix**:
```bash
# Run seed script again
cd apps/backend
export DATABASE_URL="your_railway_db_url"
npx ts-node scripts/railway-seed.ts
```

### Error: "Cannot read property 'metadata' of null"

**Cause**: ClientSettings missing or metadata field is null

**Fix**:
```sql
-- In Railway PostgreSQL shell
UPDATE client_settings
SET metadata = '{"bookingUrl":"https://calendly.com/test","booking_link_enabled":true}'::jsonb
WHERE "clientId" = 'default-client';
```

### Error: "TWILIO_ACCOUNT_SID is not defined"

**Cause**: Environment variable not set in Railway

**Fix**:
1. Go to Railway dashboard → Variables
2. Add TWILIO_ACCOUNT_SID with your actual value
3. Redeploy service

### Error: "Prisma Client validation error"

**Cause**: Schema mismatch between code and database

**Fix**:
```bash
# In Railway shell
npx prisma migrate deploy --schema=/app/prisma/schema.prisma
npx prisma generate --schema=/app/prisma/schema.prisma
```

### Error: "Database connection timeout"

**Cause**: DATABASE_URL incorrect or PostgreSQL plugin not attached

**Fix**:
1. Verify PostgreSQL plugin is attached to service
2. Check DATABASE_URL in Railway variables matches plugin connection string
3. Restart service

---

## ✅ SUCCESS CHECKLIST

- [ ] Prisma migrations applied (5 migrations)
- [ ] Prisma client generated
- [ ] Environment variables set in Railway
- [ ] Default client created (id: "default-client")
- [ ] ClientSettings created with metadata.bookingUrl
- [ ] Backend starts without errors
- [ ] Test SMS triggers AI pipeline successfully
- [ ] Dashboard shows client data

---

## 📝 NOTES

- **Client ID is hardcoded**: "default-client" - do not change without updating ENV vars
- **Metadata structure**: `{ "bookingUrl": "...", "booking_link_enabled": true }`
- **Twilio number validation**: Must be E.164 format (+1XXXXXXXXXX)
- **Multi-tenant ready**: Can add more clients later with unique IDs
- **Seed script is idempotent**: Safe to run multiple times (uses ON CONFLICT)

---

## 🚀 POST-REPAIR TESTING

1. **Send test SMS**: "Hi, I need help with plumbing"
2. **Expected AI response**: Booking link + clarification question
3. **Check Railway logs**: Full pipeline execution visible
4. **Visit dashboard**: Client appears with conversation history
5. **Test urgent flow**: "Emergency! My basement is flooding!"
6. **Expected**: Urgent alert + booking link sent

---

**Last Updated**: 2025-12-11
**Status**: Ready for production deployment
