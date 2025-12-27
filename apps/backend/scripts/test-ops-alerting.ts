/**
 * TEST OPS ALERTING CONFIGURATION
 *
 * This script validates that ops alerting is correctly wired:
 * - Alerts sent FROM +447450326372 (dedicated ops number)
 * - Alerts delivered TO +447542769817 (founder's personal phone)
 * - Alert logged in alert_logs table
 *
 * Usage:
 *   npx ts-node scripts/test-ops-alerting.ts
 *
 * Expected Result:
 *   - SMS arrives at +447542769817 within 10 seconds
 *   - SMS shows sender as +447450326372
 *   - Console logs show successful delivery
 *   - Database has new entry in alert_logs table
 */

import { AlertService, AlertTemplates } from "../src/services/AlertService";
import { prisma } from "../src/db";

async function testOpsAlerting() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🧪 TESTING OPS ALERTING CONFIGURATION");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("Expected behavior:");
  console.log("  1. SMS sent FROM +447450326372 (ops number)");
  console.log("  2. SMS delivered TO +447542769817 (founder's phone)");
  console.log("  3. Alert logged in alert_logs table");
  console.log("");

  try {
    const alertTemplate = AlertTemplates.testAlert();

    console.log("Alert details:");
    console.log(`  Type: ${alertTemplate.type}`);
    console.log(`  Severity: ${alertTemplate.severity}`);
    console.log(`  Message: "${alertTemplate.message}"`);
    console.log("");

    // Send test alert
    console.log("📤 Sending test alert...");
    const result = await AlertService.sendCriticalAlert(alertTemplate);

    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (result.success) {
      console.log("✅ TEST PASSED");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("");
      console.log("Alert sent successfully!");
      console.log(`  From: ${process.env.TWILIO_OPS_NUMBER || "+447450326372"}`);
      console.log(`  To: ${process.env.FOUNDER_ALERT_PHONE || "+447542769817"}`);
      console.log(`  Message: "${alertTemplate.message}"`);
      console.log(`  Alert Key: ${alertTemplate.type}`);
      console.log(`  Alert ID: ${result.alertId}`);
      console.log(`  Channel: ${result.channel}`);
      console.log("");
      console.log("Next steps:");
      console.log("  1. Check your phone (+447542769817) for SMS");
      console.log("  2. Verify sender shows +447450326372");
      console.log("  3. Message should say: 'JobRun Ops alerting is live.'");
      console.log("");

      // Query alert log to verify database entry
      if (result.alertId) {
        const alertLog = await prisma.alertLog.findUnique({
          where: { id: result.alertId },
        });

        if (alertLog) {
          console.log("Database verification:");
          console.log(`  ✅ Alert logged in database`);
          console.log(`  Alert type: ${alertLog.alertType}`);
          console.log(`  Alert key: ${alertLog.alertKey}`);
          console.log(`  Severity: ${alertLog.severity}`);
          console.log(`  Delivered at: ${alertLog.deliveredAt.toISOString()}`);
        }
      }

      console.log("");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      process.exit(0);
    } else {
      console.log("❌ TEST FAILED");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("");
      console.log(`Error: ${result.error || "Unknown error"}`);
      console.log(`Suppressed: ${result.suppressed || false}`);
      console.log("");

      if (result.suppressed) {
        console.log("Note: Alert was suppressed (likely due to recent duplicate)");
        console.log("Wait 6 hours or check alert_logs table for recent TEST_ALERT entries");
      }

      console.log("");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      process.exit(1);
    }
  } catch (error) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ CRITICAL ERROR");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("");
    console.error(error);
    console.error("");
    console.error("This likely means AlertService configuration failed.");
    console.error("Check that env vars are set correctly:");
    console.error("  FOUNDER_ALERT_PHONE=+447542769817");
    console.error("  TWILIO_OPS_NUMBER=+447450326372");
    console.error("  TWILIO_ACCOUNT_SID=ACxxx...");
    console.error("  TWILIO_AUTH_TOKEN=xxx...");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testOpsAlerting();
