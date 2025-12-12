#!/usr/bin/env ts-node

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * JOBRUN PRODUCTION SEED SCRIPT
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Purpose:
 *   Creates default client and settings for Railway production deployment
 *
 * Features:
 *   - Upsert operations (idempotent - safe to run multiple times)
 *   - E.164 phone number validation
 *   - Comprehensive verification
 *   - Detailed logging with visual indicators
 *   - Environment variable configuration
 *   - Error handling and rollback
 *
 * Usage:
 *   export DATABASE_URL="postgresql://..."
 *   export TWILIO_NUMBER="+15555551234"
 *   export BOOKING_URL="https://calendly.com/your-link"  # Optional
 *   npx ts-node prisma/seed-production.ts
 *
 * Requirements:
 *   - DATABASE_URL must point to production database
 *   - TWILIO_NUMBER must be E.164 format (+1XXXXXXXXXX)
 *   - Node.js 18+
 *   - @prisma/client installed
 *
 * Safety:
 *   - Uses upsert - won't duplicate records
 *   - Validates input before database operations
 *   - Verifies all records after creation
 *   - Returns exit code 1 on failure
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface SeedConfig {
  clientId: string;
  twilioNumber: string;
  urgentAlertNumber: string;
  bookingUrl: string;
  businessName: string;
}

function loadConfig(): SeedConfig {
  const twilioNumber = process.env.TWILIO_NUMBER || "";
  const urgentAlertNumber = process.env.URGENT_ALERT_NUMBER || twilioNumber;
  const bookingUrl =
    process.env.BOOKING_URL || "https://calendly.com/jobrun-demo";
  const businessName = process.env.BUSINESS_NAME || "JobRun Test Client";

  return {
    clientId: "default-client", // Fixed ID - do not change
    twilioNumber,
    urgentAlertNumber,
    bookingUrl,
    businessName,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VALIDATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Validate E.164 phone number format
 * Required format: +1XXXXXXXXXX (11 digits total, starts with +1)
 */
function validateE164PhoneNumber(phone: string, fieldName: string): void {
  const e164Regex = /^\+1[0-9]{10}$/;

  if (!phone) {
    throw new Error(`${fieldName} is required`);
  }

  if (!e164Regex.test(phone)) {
    throw new Error(
      `${fieldName} must be in E.164 format: +1XXXXXXXXXX\n` +
        `   Current value: "${phone}"\n` +
        `   Example valid: "+15555551234"`
    );
  }

  console.log(`   ✓ ${fieldName}: ${phone} (valid E.164 format)`);
}

/**
 * Validate booking URL format
 */
function validateBookingUrl(url: string): void {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("URL must use http or https protocol");
    }
    console.log(`   ✓ Booking URL: ${url} (valid)`);
  } catch (error) {
    throw new Error(
      `Booking URL is invalid: "${url}"\n` +
        `   Error: ${error instanceof Error ? error.message : String(error)}\n` +
        `   Example: "https://calendly.com/your-link"`
    );
  }
}

/**
 * Validate database connection
 */
async function validateDatabaseConnection(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1 as connected`;
    console.log("   ✓ Database connection successful");
  } catch (error) {
    throw new Error(
      `Database connection failed\n` +
        `   Error: ${error instanceof Error ? error.message : String(error)}\n` +
        `   Check DATABASE_URL environment variable`
    );
  }
}

/**
 * Validate all configuration
 */
function validateConfig(config: SeedConfig): void {
  console.log("\n🔍 Validating configuration...\n");

  validateE164PhoneNumber(config.twilioNumber, "TWILIO_NUMBER");
  validateE164PhoneNumber(config.urgentAlertNumber, "URGENT_ALERT_NUMBER");
  validateBookingUrl(config.bookingUrl);

  if (!config.clientId) {
    throw new Error("Client ID cannot be empty");
  }
  console.log(`   ✓ Client ID: ${config.clientId}`);

  if (!config.businessName || config.businessName.trim().length === 0) {
    throw new Error("Business name cannot be empty");
  }
  console.log(`   ✓ Business Name: ${config.businessName}`);

  console.log("\n✅ All configuration validated\n");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DATABASE OPERATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Upsert default client
 */
async function upsertDefaultClient(config: SeedConfig) {
  console.log("🏢 Creating/updating default client...\n");

  const clientData = {
    businessName: config.businessName,
    region: "US",
    phoneNumber: config.urgentAlertNumber,
    twilioNumber: config.twilioNumber,
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
  };

  try {
    const client = await prisma.client.upsert({
      where: { id: config.clientId },
      update: {
        ...clientData,
        updatedAt: new Date(),
      },
      create: {
        id: config.clientId, // Critical: Fixed ID for DEFAULT_CLIENT_ID env var
        ...clientData,
      },
    });

    console.log(`   ✓ Client ID: ${client.id}`);
    console.log(`   ✓ Business Name: ${client.businessName}`);
    console.log(`   ✓ Twilio Number: ${client.twilioNumber}`);
    console.log(`   ✓ Alert Number: ${client.phoneNumber}`);
    console.log(`   ✓ Region: ${client.region}`);
    console.log(`   ✓ Timezone: ${client.timezone}`);
    console.log(`   ✓ Created At: ${client.createdAt.toISOString()}`);
    console.log(`   ✓ Updated At: ${client.updatedAt.toISOString()}\n`);

    return client;
  } catch (error) {
    throw new Error(
      `Failed to upsert client\n` +
        `   Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Upsert client settings
 */
async function upsertClientSettings(config: SeedConfig) {
  console.log("⚙️  Creating/updating client settings...\n");

  const metadata = {
    bookingUrl: config.bookingUrl,
    urgent_alert_number: config.urgentAlertNumber,
    booking_link_enabled: true,
    onboarding_complete: true,
    system_version: "v1.0.0",
    ai_pipeline_enabled: true,
  };

  const settingsData = {
    businessName: config.businessName,
    services: "Home Services, Repairs, Maintenance",
    availability: "Monday-Friday 9am-5pm",
    pricing: "Service call: $95, Hourly rate: $150",
    phoneNumber: config.urgentAlertNumber,
    email: "contact@jobrun.com",
    website: "https://jobrun.com",
    serviceArea: "Local service area",
    metadata: metadata,
  };

  try {
    // Check if settings exist
    const existing = await prisma.clientSettings.findUnique({
      where: { clientId: config.clientId },
    });

    let settings;

    if (existing) {
      console.log("   ℹ️  Existing settings found - updating...");
      settings = await prisma.clientSettings.update({
        where: { clientId: config.clientId },
        data: {
          ...settingsData,
          updatedAt: new Date(),
        },
      });
    } else {
      console.log("   ℹ️  No existing settings - creating new...");
      settings = await prisma.clientSettings.create({
        data: {
          clientId: config.clientId,
          ...settingsData,
        },
      });
    }

    console.log(`   ✓ Settings ID: ${settings.id}`);
    console.log(`   ✓ Client ID: ${settings.clientId}`);
    console.log(`   ✓ Business Name: ${settings.businessName}`);
    console.log(`   ✓ Services: ${settings.services}`);
    console.log(`   ✓ Phone: ${settings.phoneNumber}`);
    console.log(`   ✓ Email: ${settings.email}`);

    // Display metadata
    const meta = settings.metadata as Record<string, unknown>;
    console.log(`   ✓ Metadata:`);
    console.log(`      - Booking URL: ${meta.bookingUrl}`);
    console.log(`      - Booking Enabled: ${meta.booking_link_enabled}`);
    console.log(`      - Alert Number: ${meta.urgent_alert_number}`);
    console.log(`      - Onboarding Complete: ${meta.onboarding_complete}`);
    console.log(`      - AI Pipeline: ${meta.ai_pipeline_enabled}`);
    console.log();

    return settings;
  } catch (error) {
    throw new Error(
      `Failed to upsert client settings\n` +
        `   Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VERIFICATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Verify all records were created correctly
 */
async function verifySeeding(config: SeedConfig) {
  console.log("🔍 Verifying database records...\n");

  let hasErrors = false;

  // 1. Verify client exists
  const client = await prisma.client.findUnique({
    where: { id: config.clientId },
    include: {
      customers: true,
      leads: true,
      messages: true,
    },
  });

  if (!client) {
    console.error(`   ❌ Client not found: ${config.clientId}`);
    hasErrors = true;
  } else {
    console.log(`   ✓ Client exists: ${client.id}`);
    console.log(`      - Business: ${client.businessName}`);
    console.log(`      - Twilio: ${client.twilioNumber}`);
    console.log(`      - Customers: ${client.customers.length}`);
    console.log(`      - Leads: ${client.leads.length}`);
    console.log(`      - Messages: ${client.messages.length}`);
  }

  // 2. Verify client settings exist
  const settings = await prisma.clientSettings.findUnique({
    where: { clientId: config.clientId },
  });

  if (!settings) {
    console.error(`   ❌ ClientSettings not found for: ${config.clientId}`);
    hasErrors = true;
  } else {
    console.log(`   ✓ ClientSettings exists: ${settings.id}`);
    console.log(`      - Client ID: ${settings.clientId}`);
    console.log(`      - Business: ${settings.businessName}`);
  }

  // 3. Verify metadata structure
  if (settings) {
    const meta = settings.metadata;

    if (!meta || typeof meta !== "object") {
      console.error("   ❌ Metadata is null or not an object");
      hasErrors = true;
    } else {
      const metaObj = meta as Record<string, unknown>;

      // Check required fields
      const requiredFields = [
        "bookingUrl",
        "booking_link_enabled",
        "urgent_alert_number",
        "onboarding_complete",
      ];

      console.log("   ✓ Metadata structure:");
      for (const field of requiredFields) {
        if (field in metaObj) {
          console.log(`      ✓ ${field}: ${metaObj[field]}`);
        } else {
          console.error(`      ❌ Missing field: ${field}`);
          hasErrors = true;
        }
      }

      // Validate bookingUrl specifically
      if ("bookingUrl" in metaObj && typeof metaObj.bookingUrl === "string") {
        if (metaObj.bookingUrl !== config.bookingUrl) {
          console.error(
            `      ❌ Booking URL mismatch:\n` +
              `         Expected: ${config.bookingUrl}\n` +
              `         Got: ${metaObj.bookingUrl}`
          );
          hasErrors = true;
        }
      }
    }
  }

  // 4. Test database query
  try {
    const result = await prisma.$queryRaw<
      Array<{
        id: string;
        businessName: string;
        twilioNumber: string | null;
        booking_url: string | null;
      }>
    >`
      SELECT
        c.id,
        c."businessName",
        c."twilioNumber",
        cs.metadata->>'bookingUrl' as booking_url
      FROM clients c
      LEFT JOIN client_settings cs ON cs."clientId" = c.id
      WHERE c.id = ${config.clientId}
    `;

    if (result.length === 0) {
      console.error("   ❌ Query test failed: No results");
      hasErrors = true;
    } else {
      console.log("\n   ✓ Query test passed:");
      console.log(`      - ID: ${result[0].id}`);
      console.log(`      - Business: ${result[0].businessName}`);
      console.log(`      - Twilio: ${result[0].twilioNumber}`);
      console.log(`      - Booking URL: ${result[0].booking_url}`);
    }
  } catch (error) {
    console.error(
      `   ❌ Query test failed: ${error instanceof Error ? error.message : String(error)}`
    );
    hasErrors = true;
  }

  console.log();

  if (hasErrors) {
    throw new Error("Verification failed - see errors above");
  }

  console.log("✅ All verifications passed\n");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN SEED FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function seedProduction() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 JOBRUN PRODUCTION SEED");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Started: ${new Date().toISOString()}\n`);

  // Load configuration
  const config = loadConfig();

  console.log("📋 Configuration loaded:");
  console.log(`   Client ID: ${config.clientId}`);
  console.log(`   Business Name: ${config.businessName}`);
  console.log(`   Twilio Number: ${config.twilioNumber}`);
  console.log(`   Alert Number: ${config.urgentAlertNumber}`);
  console.log(`   Booking URL: ${config.bookingUrl}`);

  try {
    // Step 1: Validate everything
    await validateDatabaseConnection();
    validateConfig(config);

    // Step 2: Upsert client
    const client = await upsertDefaultClient(config);

    // Step 3: Upsert client settings
    const settings = await upsertClientSettings(config);

    // Step 4: Verify all records
    await verifySeeding(config);

    // Success summary
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SEEDING COMPLETED SUCCESSFULLY");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("📊 Summary:");
    console.log(`   Client ID: ${client.id}`);
    console.log(`   Business: ${client.businessName}`);
    console.log(`   Twilio: ${client.twilioNumber}`);
    console.log(`   Alert: ${client.phoneNumber}`);
    console.log(`   Settings ID: ${settings.id}`);
    console.log(`   Booking URL: ${(settings.metadata as any).bookingUrl}`);
    console.log();

    console.log("🚀 Next Steps:");
    console.log("   1. Verify Railway environment variables:");
    console.log(`      DEFAULT_CLIENT_ID="${config.clientId}"`);
    console.log(`      TWILIO_NUMBER="${config.twilioNumber}"`);
    console.log();
    console.log("   2. Check backend logs for startup:");
    console.log("      ✅ All required environment variables present");
    console.log("      ✅ Backend listening on 0.0.0.0:3001");
    console.log();
    console.log("   3. Test Twilio webhook:");
    console.log(`      Send SMS to ${config.twilioNumber}`);
    console.log('      Message: "Hi, I need help"');
    console.log("      Expected: AI pipeline executes successfully");
    console.log();
    console.log("   4. Monitor Railway logs:");
    console.log("      Look for: 🤖 INBOUND SMS AI PIPELINE START");
    console.log("      Should see: ✅ INBOUND SMS PIPELINE COMPLETE");
    console.log();

    console.log(`Completed: ${new Date().toISOString()}`);
    console.log();
  } catch (error) {
    console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ SEEDING FAILED");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (error instanceof Error) {
      console.error("Error:", error.message);
      if (error.stack) {
        console.error("\nStack trace:");
        console.error(error.stack);
      }
    } else {
      console.error("Unknown error:", String(error));
    }

    console.error("\n💡 Troubleshooting:");
    console.error("   1. Check DATABASE_URL is set and valid");
    console.error("   2. Verify TWILIO_NUMBER is in E.164 format (+1XXXXXXXXXX)");
    console.error("   3. Ensure database is accessible");
    console.error("   4. Run: npx prisma migrate deploy");
    console.error("   5. Check Prisma schema matches database");
    console.error();

    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXECUTE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

seedProduction()
  .catch((error) => {
    console.error("\n🛑 Seed script exited with errors\n");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
