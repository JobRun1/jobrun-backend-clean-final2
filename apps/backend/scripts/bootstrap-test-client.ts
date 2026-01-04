/**
 * BOOTSTRAP TEST CLIENT FOR V1 REALITY TEST
 *
 * Creates the FastFix Plumbing test client with all required configuration
 * to ensure missed calls to 07414148956 are correctly processed.
 *
 * This script is idempotent and safe to run multiple times.
 *
 * Usage:
 *   npx ts-node scripts/bootstrap-test-client.ts
 *
 * Exit codes:
 *   0 - Success (client created or already exists)
 *   1 - Fatal error (database connection, validation failure)
 */

import { prisma } from "../src/db";

const TEST_CLIENT_ID = "fastfix-plumbing-test";

// Test client details - EXACT VALUES FROM REQUIREMENTS
const TEST_CLIENT = {
  id: TEST_CLIENT_ID,
  businessName: "FastFix Plumbing & Heating",
  region: "UK",
  timezone: "Europe/London",
  phoneNumber: "447542769817", // Business owner phone (normalized for alerts)
  twilioNumber: "447414148956", // Inbound number (normalized)
  demoClient: false,
  demoToolsVisible: false,
};

const TEST_CLIENT_SETTINGS = {
  businessName: "FastFix Plumbing & Heating",
  services: `Emergency Plumbing & Boiler Repairs

Services:
• Emergency leaks
• Burst pipes
• Blocked drains
• Boiler breakdown (no heating / hot water)`,

  availability: `Business Hours:
Monday–Friday: 08:00–18:00
Saturday: 09:00–14:00
Sunday: Closed`,

  phoneNumber: "+447542769817", // Business owner alert phone
  notificationsPaused: false,

  metadata: {
    bookingUrl: `/book/${TEST_CLIENT_ID}`,
    businessType: "Emergency Plumbing & Boiler Repairs",
    urgencyKeywords: ["leak", "burst", "flooding", "no heating", "no hot water", "emergency"],
    bookingSetup: {
      visitType: "on-site",
      duration: 60,
      availability: "same-day and next-day only"
    }
  },

  agentSettings: {
    // Settings for AI agent handling customer messages
    businessContext: "Emergency plumbing and heating repairs in UK",
    urgencyDetection: true,
    urgencyKeywords: ["leak", "burst", "flooding", "no heating", "no hot water", "emergency"]
  }
};

const TEST_BUSINESS_HOURS = {
  monday: { start: "08:00", end: "18:00" },
  tuesday: { start: "08:00", end: "18:00" },
  wednesday: { start: "08:00", end: "18:00" },
  thursday: { start: "08:00", end: "18:00" },
  friday: { start: "08:00", end: "18:00" },
  saturday: { start: "09:00", end: "14:00" },
  sunday: null, // Closed
};

interface BootstrapResult {
  clientCreated: boolean;
  settingsCreated: boolean;
  billingCreated: boolean;
  controlsCreated: boolean;
  clientId: string;
}

async function bootstrapTestClient(): Promise<BootstrapResult> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔧 BOOTSTRAPPING V1 TEST CLIENT");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  let clientCreated = false;
  let settingsCreated = false;
  let billingCreated = false;
  let controlsCreated = false;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  STEP 1: Check/Create Client
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log(`[1/4] Checking if Client exists (id="${TEST_CLIENT_ID}")...`);

  let client = await prisma.client.findUnique({
    where: { id: TEST_CLIENT_ID },
    select: {
      id: true,
      businessName: true,
      region: true,
      twilioNumber: true,
      phoneNumber: true
    },
  });

  if (client) {
    console.log(`   ✅ Client already exists`);
    console.log(`      ID: ${client.id}`);
    console.log(`      Business: ${client.businessName}`);
    console.log(`      Region: ${client.region}`);
    console.log(`      Twilio Number: ${client.twilioNumber}`);
    console.log(`      Owner Phone: ${client.phoneNumber}`);
  } else {
    console.log(`   ⚠️  Client does not exist - creating...`);

    client = await prisma.client.create({
      data: {
        ...TEST_CLIENT,
        businessHours: TEST_BUSINESS_HOURS,
      },
      select: {
        id: true,
        businessName: true,
        region: true,
        twilioNumber: true,
        phoneNumber: true
      },
    });

    clientCreated = true;
    console.log(`   ✅ Client created successfully`);
    console.log(`      ID: ${client.id}`);
    console.log(`      Business: ${client.businessName}`);
    console.log(`      Region: ${client.region}`);
    console.log(`      Twilio Number: ${client.twilioNumber}`);
    console.log(`      Owner Phone: ${client.phoneNumber}`);
  }

  console.log("");

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  STEP 2: Check/Create ClientSettings
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log(`[2/4] Checking if ClientSettings exists...`);

  let settings = await prisma.clientSettings.findUnique({
    where: { clientId: TEST_CLIENT_ID },
    select: { id: true, clientId: true, metadata: true },
  });

  if (settings) {
    console.log(`   ✅ ClientSettings already exists`);
    console.log(`      Settings ID: ${settings.id}`);
  } else {
    console.log(`   ⚠️  ClientSettings does not exist - creating...`);

    const newSettings = await prisma.clientSettings.create({
      data: {
        clientId: TEST_CLIENT_ID,
        ...TEST_CLIENT_SETTINGS,
      },
      select: { id: true, clientId: true },
    });

    settingsCreated = true;
    console.log(`   ✅ ClientSettings created successfully`);
    console.log(`      Settings ID: ${newSettings.id}`);
  }

  console.log("");

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  STEP 3: Check/Create ClientBilling (Required for SystemGate)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log(`[3/4] Checking if ClientBilling exists...`);

  let billing = await prisma.clientBilling.findUnique({
    where: { clientId: TEST_CLIENT_ID },
    select: { id: true, status: true },
  });

  if (billing) {
    console.log(`   ✅ ClientBilling already exists`);
    console.log(`      Billing ID: ${billing.id}`);
    console.log(`      Status: ${billing.status}`);
  } else {
    console.log(`   ⚠️  ClientBilling does not exist - creating...`);

    const newBilling = await prisma.clientBilling.create({
      data: {
        clientId: TEST_CLIENT_ID,
        status: "ACTIVE", // Test client is active
        paymentSource: "WAIVED", // Test/demo client
      },
      select: { id: true, status: true },
    });

    billingCreated = true;
    console.log(`   ✅ ClientBilling created successfully`);
    console.log(`      Billing ID: ${newBilling.id}`);
    console.log(`      Status: ${newBilling.status}`);
  }

  console.log("");

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  STEP 4: Check/Create ClientControls (Required for SystemGate)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log(`[4/4] Checking if ClientControls exists...`);

  let controls = await prisma.clientControls.findUnique({
    where: { clientId: TEST_CLIENT_ID },
    select: { id: true, outboundPaused: true, aiDisabled: true },
  });

  if (controls) {
    console.log(`   ✅ ClientControls already exists`);
    console.log(`      Controls ID: ${controls.id}`);
    console.log(`      Outbound Paused: ${controls.outboundPaused}`);
    console.log(`      AI Disabled: ${controls.aiDisabled}`);
  } else {
    console.log(`   ⚠️  ClientControls does not exist - creating...`);

    const newControls = await prisma.clientControls.create({
      data: {
        clientId: TEST_CLIENT_ID,
        outboundPaused: false, // SMS enabled
        aiDisabled: false, // AI enabled
        opsAlertsMuted: false, // Ops alerts enabled
      },
      select: { id: true, outboundPaused: true, aiDisabled: true },
    });

    controlsCreated = true;
    console.log(`   ✅ ClientControls created successfully`);
    console.log(`      Controls ID: ${newControls.id}`);
    console.log(`      Outbound Paused: ${newControls.outboundPaused}`);
    console.log(`      AI Disabled: ${newControls.aiDisabled}`);
  }

  console.log("");

  return {
    clientCreated,
    settingsCreated,
    billingCreated,
    controlsCreated,
    clientId: TEST_CLIENT_ID,
  };
}

async function main() {
  try {
    const result = await bootstrapTestClient();

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ BOOTSTRAP COMPLETE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    console.log("Summary:");
    console.log(`  Client ID: ${result.clientId}`);
    console.log(`  Client created: ${result.clientCreated ? "YES (new)" : "NO (already existed)"}`);
    console.log(`  Settings created: ${result.settingsCreated ? "YES (new)" : "NO (already existed)"}`);
    console.log(`  Billing created: ${result.billingCreated ? "YES (new)" : "NO (already existed)"}`);
    console.log(`  Controls created: ${result.controlsCreated ? "YES (new)" : "NO (already existed)"}`);
    console.log("");

    if (!result.clientCreated && !result.settingsCreated && !result.billingCreated && !result.controlsCreated) {
      console.log("ℹ️  No changes made - test client already fully configured");
    } else {
      console.log("✅ Changes applied successfully");
    }

    console.log("");
    console.log("Test Configuration:");
    console.log("  Business: FastFix Plumbing & Heating");
    console.log("  Inbound Calls To: 07414148956 (UK format)");
    console.log("  Alerts Sent To: 07542769817 (UK format)");
    console.log("  Twilio Number (normalized): +447414148956");
    console.log("  Owner Phone (normalized): +447542769817");
    console.log("");
    console.log("Expected Flow:");
    console.log("  1. External customer calls 07414148956");
    console.log("  2. Call is missed (not answered)");
    console.log("  3. Twilio status webhook finds client by twilioNumber");
    console.log("  4. System sends onboarding SMS to caller");
    console.log("  5. Caller replies with job details");
    console.log("  6. AI pipeline processes inquiry");
    console.log("  7. Alert sent to business owner at 07542769817");
    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    process.exit(0);
  } catch (error) {
    console.error("");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ BOOTSTRAP FAILED");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("");
    console.error("Error:", error instanceof Error ? error.message : String(error));
    console.error("");

    if (error instanceof Error && error.stack) {
      console.error("Stack trace:");
      console.error(error.stack);
      console.error("");
    }

    console.error("Possible causes:");
    console.error("  - Database connection failed (check DATABASE_URL in .env)");
    console.error("  - Prisma client not generated (run: npx prisma generate)");
    console.error("  - Database schema not applied (run: npx prisma migrate deploy)");
    console.error("  - Unique constraint violation (client may exist with different data)");
    console.error("");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
