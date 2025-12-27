/**
 * VERIFY BOOKING URL
 *
 * Validates that the default client's metadata.bookingUrl passes the
 * isValidBookingUrl() invariant check used by HealthCheck.ts
 *
 * Purpose:
 * - Quick smoke test after running bootstrap-default-client.ts
 * - Confirms bookingUrl will pass the BOOKING_URL_VALID startup invariant
 * - Can be used in CI/CD pipelines (exits non-zero on failure)
 *
 * Usage:
 *   npx ts-node scripts/verify-booking-url.ts
 *
 * Exit codes:
 *   0 - PASS: bookingUrl is valid
 *   1 - FAIL: bookingUrl is missing or invalid
 */

import { prisma } from "../src/db";
import { isValidBookingUrl } from "../src/services/HealthCheck";

const DEFAULT_CLIENT_ID = process.env.DEFAULT_CLIENT_ID || "default-client";

async function verifyBookingUrl(): Promise<void> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔍 VERIFY BOOKING URL");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log(`Checking ClientSettings for clientId="${DEFAULT_CLIENT_ID}"...`);
  console.log("");

  // Query ClientSettings
  const settings = await prisma.clientSettings.findUnique({
    where: { clientId: DEFAULT_CLIENT_ID },
    select: { id: true, clientId: true, metadata: true },
  });

  if (!settings) {
    console.error("❌ FAIL: ClientSettings not found");
    console.error("");
    console.error("ClientSettings does not exist for this client.");
    console.error("Run bootstrap-default-client.ts first:");
    console.error("  npx ts-node scripts/bootstrap-default-client.ts");
    console.error("");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    process.exit(1);
  }

  // Extract bookingUrl from metadata
  const metadata = settings.metadata as Record<string, unknown> | null;
  const bookingUrl = metadata && typeof metadata === 'object' && typeof metadata.bookingUrl === 'string'
    ? metadata.bookingUrl
    : null;

  console.log("Found ClientSettings:");
  console.log(`  Settings ID: ${settings.id}`);
  console.log(`  Client ID: ${settings.clientId}`);
  console.log("");

  console.log("Extracted metadata.bookingUrl:");
  if (bookingUrl === null) {
    console.log(`  Value: (null or missing)`);
  } else {
    console.log(`  Value: "${bookingUrl}"`);
  }
  console.log("");

  // Validate using same function as HealthCheck
  const isValid = isValidBookingUrl(bookingUrl);

  console.log("Validation result:");
  console.log(`  isValidBookingUrl(): ${isValid ? "✅ PASS" : "❌ FAIL"}`);
  console.log("");

  if (isValid) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ PASS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    console.log("The bookingUrl will pass the BOOKING_URL_VALID invariant check.");
    console.log("The backend should start without errors.");
    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    process.exit(0);
  } else {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ FAIL");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("");
    console.error("The bookingUrl is invalid and will FAIL the startup invariant.");
    console.error("");
    console.error("Expected formats:");
    console.error("  - Internal route: /book/<clientId>");
    console.error("  - Absolute URL: https://<domain>/book/<clientId>");
    console.error("");
    console.error("Fix by running:");
    console.error("  npx ts-node scripts/bootstrap-default-client.ts");
    console.error("");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    process.exit(1);
  }
}

async function main() {
  try {
    await verifyBookingUrl();
  } catch (error) {
    console.error("");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ VERIFICATION FAILED");
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
    console.error("");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
