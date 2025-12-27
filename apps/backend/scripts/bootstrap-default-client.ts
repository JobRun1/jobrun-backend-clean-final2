/**
 * BOOTSTRAP DEFAULT CLIENT
 *
 * Creates the required "default-client" Client and ClientSettings if they don't exist.
 * This script is idempotent and safe to run multiple times.
 *
 * Purpose:
 * - Satisfies startup invariant: DEFAULT_CLIENT_EXISTS
 * - Provides a valid client for initial onboarding flows
 * - Can be run manually or as part of CI/CD deployment
 *
 * Usage:
 *   npx ts-node scripts/bootstrap-default-client.ts
 *
 * Exit codes:
 *   0 - Success (client created or already exists)
 *   1 - Fatal error (database connection, validation failure)
 */

import { prisma } from "../src/db";
import { isValidBookingUrl } from "../src/services/HealthCheck";

const DEFAULT_CLIENT_ID = "default-client";

interface BootstrapResult {
  clientCreated: boolean;
  settingsCreated: boolean;
  bookingUrlBackfilled: boolean;
  clientId: string;
}

async function bootstrapDefaultClient(): Promise<BootstrapResult> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔧 BOOTSTRAPPING DEFAULT CLIENT");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  let clientCreated = false;
  let settingsCreated = false;
  let bookingUrlBackfilled = false;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  STEP 1: Check/Create Client
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log(`[1/2] Checking if Client exists (id="${DEFAULT_CLIENT_ID}")...`);

  let client = await prisma.client.findUnique({
    where: { id: DEFAULT_CLIENT_ID },
    select: { id: true, businessName: true, region: true },
  });

  if (client) {
    console.log(`   ✅ Client already exists`);
    console.log(`      ID: ${client.id}`);
    console.log(`      Business: ${client.businessName}`);
    console.log(`      Region: ${client.region}`);
  } else {
    console.log(`   ⚠️  Client does not exist - creating...`);

    client = await prisma.client.create({
      data: {
        id: DEFAULT_CLIENT_ID,
        businessName: "Default Demo Client",
        region: "US",
        timezone: "America/New_York",
        paymentActive: false,
        demoToolsVisible: true,
        demoClient: true,
      },
      select: { id: true, businessName: true, region: true },
    });

    clientCreated = true;
    console.log(`   ✅ Client created successfully`);
    console.log(`      ID: ${client.id}`);
    console.log(`      Business: ${client.businessName}`);
    console.log(`      Region: ${client.region}`);
  }

  console.log("");

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  STEP 2: Check/Create ClientSettings
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log(`[2/2] Checking if ClientSettings exists (clientId="${DEFAULT_CLIENT_ID}")...`);

  let settings = await prisma.clientSettings.findUnique({
    where: { clientId: DEFAULT_CLIENT_ID },
    select: { id: true, clientId: true, metadata: true },
  });

  if (settings) {
    console.log(`   ✅ ClientSettings already exists`);
    console.log(`      Settings ID: ${settings.id}`);
    console.log(`      Client ID: ${settings.clientId}`);

    // Check if metadata.bookingUrl is missing, empty, or invalid
    // Type-safe metadata handling
    const metadata = settings.metadata as Record<string, unknown> | null;
    const bookingUrl = metadata && typeof metadata === 'object' && typeof metadata.bookingUrl === 'string'
      ? metadata.bookingUrl
      : null;
    const hasValidBookingUrl = isValidBookingUrl(bookingUrl);

    if (!hasValidBookingUrl) {
      console.log(`   ⚠️  metadata.bookingUrl is missing or invalid - backfilling...`);
      if (bookingUrl) {
        console.log(`      Current value: "${bookingUrl}" (invalid format)`);
      }

      // Preserve existing metadata, add bookingUrl
      const updatedMetadata = {
        ...(metadata || {}),
        bookingUrl: `/book/${DEFAULT_CLIENT_ID}`,
      };

      await prisma.clientSettings.update({
        where: { clientId: DEFAULT_CLIENT_ID },
        data: { metadata: updatedMetadata },
      });

      bookingUrlBackfilled = true;
      console.log(`   ✅ Backfilled metadata.bookingUrl successfully`);
      console.log(`      Booking URL: /book/${DEFAULT_CLIENT_ID}`);
    } else {
      console.log(`   ✅ metadata.bookingUrl already set: ${bookingUrl}`);
    }
  } else {
    console.log(`   ⚠️  ClientSettings does not exist - creating...`);

    const newSettings = await prisma.clientSettings.create({
      data: {
        clientId: DEFAULT_CLIENT_ID,
        businessName: "Default Demo Client",
        services: "Demo services - not configured yet",
        availability: "24/7",
        notificationsPaused: false,
        metadata: {
          bookingUrl: `/book/${DEFAULT_CLIENT_ID}`,
        },
      },
      select: { id: true, clientId: true },
    });

    settingsCreated = true;
    console.log(`   ✅ ClientSettings created successfully`);
    console.log(`      Settings ID: ${newSettings.id}`);
    console.log(`      Client ID: ${newSettings.clientId}`);
    console.log(`      Booking URL: /book/${DEFAULT_CLIENT_ID}`);
  }

  console.log("");

  return {
    clientCreated,
    settingsCreated,
    bookingUrlBackfilled,
    clientId: DEFAULT_CLIENT_ID,
  };
}

async function main() {
  try {
    const result = await bootstrapDefaultClient();

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ BOOTSTRAP COMPLETE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    console.log("Summary:");
    console.log(`  Client ID: ${result.clientId}`);
    console.log(`  Client created: ${result.clientCreated ? "YES (new)" : "NO (already existed)"}`);
    console.log(`  Settings created: ${result.settingsCreated ? "YES (new)" : "NO (already existed)"}`);
    console.log(`  Booking URL backfilled: ${result.bookingUrlBackfilled ? "YES (metadata updated)" : "NO (already set)"}`);
    console.log("");

    if (!result.clientCreated && !result.settingsCreated && !result.bookingUrlBackfilled) {
      console.log("ℹ️  No changes made - default client already exists");
    } else {
      console.log("✅ Changes applied successfully");
    }

    console.log("");
    console.log("Next steps:");
    console.log("  1. Set DEFAULT_CLIENT_ID in .env (if not already set):");
    console.log(`     DEFAULT_CLIENT_ID=${result.clientId}`);
    console.log("  2. Start the backend:");
    console.log("     npm run dev");
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
