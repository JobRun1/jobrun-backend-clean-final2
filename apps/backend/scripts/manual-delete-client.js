const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CLIENT_ID = 'cmjj6xyxm0006kih7xpsoe80m';
const BUSINESS_NAME = 'Onboarding in progress';

(async () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("⚠️  [AdminCockpit] DELETE REQUEST (MANUAL)");
  console.log(`   Client ID: ${CLIENT_ID}`);
  console.log(`   Confirmation: ${BUSINESS_NAME}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: LOAD CLIENT AND VALIDATE EXISTENCE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const clientResult = await prisma.$queryRaw`
      SELECT
        id,
        "businessName",
        "paymentActive",
        "opsAlertsMuted",
        "twilioNumber"
      FROM clients
      WHERE id = ${CLIENT_ID};
    `;

    if (!clientResult || clientResult.length === 0) {
      console.error(`❌ [AdminCockpit] DELETE REJECTED: Client not found (${CLIENT_ID})`);
      return;
    }

    const client = clientResult[0];
    console.log(`✅ [AdminCockpit] Client found: ${client.businessName}\n`);

    // Get onboarding state
    const onboardingResult = await prisma.$queryRaw`
      SELECT "completed_at" as "completedAt"
      FROM onboarding_states
      WHERE client_id = ${CLIENT_ID};
    `;

    const onboardingComplete = onboardingResult && onboardingResult.length > 0 && onboardingResult[0].completedAt !== null;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: SAFETY CHECKS (ALL MUST PASS)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const safetyViolations = [];

    // CHECK 1: Client must be inactive (onboarding not complete)
    if (onboardingComplete) {
      safetyViolations.push("Client is ACTIVE (onboarding completed). Cannot delete active clients.");
    }

    // CHECK 2: Alerts must be muted
    if (!client.opsAlertsMuted) {
      safetyViolations.push("Alerts NOT muted (opsAlertsMuted=false). Mute alerts first to confirm deletion intent.");
    }

    // CHECK 3: Payment must not be active
    if (client.paymentActive) {
      safetyViolations.push("Payment is ACTIVE (paymentActive=true). Cannot delete paying customers.");
    }

    // CHECK 4: Business name must match exactly
    if (BUSINESS_NAME !== client.businessName) {
      safetyViolations.push(
        `Business name confirmation mismatch. Expected: "${client.businessName}", Got: "${BUSINESS_NAME}"`
      );
    }

    if (safetyViolations.length > 0) {
      console.error("❌ [AdminCockpit] DELETE REJECTED: Safety checks failed");
      safetyViolations.forEach((v, i) => console.error(`   ${i + 1}. ${v}`));
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      return;
    }

    console.log("✅ [AdminCockpit] All safety checks passed\n");

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3: EXECUTE DELETION IN TRANSACTION (ATOMIC)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    console.log("⚠️  [AdminCockpit] Beginning IRREVERSIBLE deletion transaction...\n");

    const deletionLog = await prisma.$transaction(async (tx) => {
      const log = {
        clientId: CLIENT_ID,
        businessName: client.businessName,
        deletedAt: new Date().toISOString(),
        twilioNumberReleased: null,
        recordsDeleted: {},
      };

      // STEP 3.1: Release Twilio number back to pool (if assigned)
      if (client.twilioNumber) {
        console.log(`   📞 Releasing Twilio number: ${client.twilioNumber}`);

        const poolResult = await tx.$executeRaw`
          UPDATE twilio_number_pool
          SET status = 'AVAILABLE',
              client_id = NULL,
              assigned_at = NULL
          WHERE phone_e164 = ${client.twilioNumber};
        `;

        if (poolResult > 0) {
          log.twilioNumberReleased = client.twilioNumber;
          console.log(`   ✅ Number released: ${client.twilioNumber}`);
        } else {
          console.warn(`   ⚠️  Twilio number not found in pool: ${client.twilioNumber}`);
        }
      }

      // STEP 3.2: Delete onboarding states
      const deletedOnboardingStates = await tx.$executeRaw`
        DELETE FROM onboarding_states WHERE "clientId" = ${CLIENT_ID};
      `;
      log.recordsDeleted.onboardingStates = deletedOnboardingStates;
      console.log(`   ✅ Deleted ${deletedOnboardingStates} onboarding states`);

      // STEP 3.3: Delete messages
      const deletedMessages = await tx.$executeRaw`
        DELETE FROM messages WHERE "clientId" = ${CLIENT_ID};
      `;
      log.recordsDeleted.messages = deletedMessages;
      console.log(`   ✅ Deleted ${deletedMessages} messages`);

      // STEP 3.4: Delete customers
      const deletedCustomers = await tx.$executeRaw`
        DELETE FROM customers WHERE "clientId" = ${CLIENT_ID};
      `;
      log.recordsDeleted.customers = deletedCustomers;
      console.log(`   ✅ Deleted ${deletedCustomers} customers`);

      // STEP 3.5: Delete bookings
      const deletedBookings = await tx.$executeRaw`
        DELETE FROM bookings WHERE "clientId" = ${CLIENT_ID};
      `;
      log.recordsDeleted.bookings = deletedBookings;
      console.log(`   ✅ Deleted ${deletedBookings} bookings`);

      // STEP 3.6: Delete conversations
      const deletedConversations = await tx.$executeRaw`
        DELETE FROM conversations WHERE "clientId" = ${CLIENT_ID};
      `;
      log.recordsDeleted.conversations = deletedConversations;
      console.log(`   ✅ Deleted ${deletedConversations} conversations`);

      // STEP 3.7: Delete leads
      const deletedLeads = await tx.$executeRaw`
        DELETE FROM leads WHERE "clientId" = ${CLIENT_ID};
      `;
      log.recordsDeleted.leads = deletedLeads;
      console.log(`   ✅ Deleted ${deletedLeads} leads`);

      // STEP 3.8: Delete users
      const deletedUsers = await tx.$executeRaw`
        DELETE FROM users WHERE "clientId" = ${CLIENT_ID};
      `;
      log.recordsDeleted.users = deletedUsers;
      console.log(`   ✅ Deleted ${deletedUsers} users`);

      // STEP 3.9: Delete alert logs (resourceId match)
      const deletedAlerts = await tx.$executeRaw`
        DELETE FROM alert_logs WHERE "resourceId" = ${CLIENT_ID};
      `;
      log.recordsDeleted.alertLogs = deletedAlerts;
      console.log(`   ✅ Deleted ${deletedAlerts} alert logs`);

      // STEP 3.10: Delete the client itself
      const deletedClient = await tx.$executeRaw`
        DELETE FROM clients WHERE id = ${CLIENT_ID};
      `;
      console.log(`   ✅ Deleted client: ${client.businessName}`);

      return log;
    });

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ [AdminCockpit] CLIENT DELETED SUCCESSFULLY");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("DELETION LOG:");
    console.log(JSON.stringify(deletionLog, null, 2));
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  } catch (error) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ [AdminCockpit] DELETE FAILED (TRANSACTION ROLLED BACK)");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("Error:", error.message);
    console.error(error);
    console.error("Client ID:", CLIENT_ID);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } finally {
    await prisma.$disconnect();
  }
})();
