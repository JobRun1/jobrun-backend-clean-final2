const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CLIENT_ID = 'cmjj6xyxm0006kih7xpsoe80m';
const BUSINESS_NAME = 'Onboarding in progress';

(async () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("⚠️  [AdminCockpit] DELETE REQUEST");
  console.log(`   Client ID: ${CLIENT_ID}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // Verify client exists first
    const clientCheck = await prisma.$queryRaw`
      SELECT "businessName", "opsAlertsMuted", "paymentActive"
      FROM clients WHERE id = ${CLIENT_ID};
    `;

    if (!clientCheck || clientCheck.length === 0) {
      console.error(`❌ Client not found: ${CLIENT_ID}`);
      return;
    }

    const client = clientCheck[0];
    console.log(`✅ Client found: ${client.businessName}`);
    console.log(`   opsAlertsMuted: ${client.opsAlertsMuted}`);
    console.log(`   paymentActive: ${client.paymentActive}\n`);

    console.log("⚠️  Beginning IRREVERSIBLE deletion transaction...\n");

    const deletionLog = await prisma.$transaction(async (tx) => {
      const log = {
        clientId: CLIENT_ID,
        businessName: client.businessName,
        deletedAt: new Date().toISOString(),
        twilioNumberReleased: null,
        recordsDeleted: {},
      };

      // Delete onboarding states (using raw SQL with correct column name)
      const deletedOnboardingStates = await tx.$executeRaw`
        DELETE FROM onboarding_states WHERE client_id = ${CLIENT_ID};
      `;
      log.recordsDeleted.onboardingStates = deletedOnboardingStates;
      console.log(`   ✅ Deleted ${deletedOnboardingStates} onboarding states`);

      // Delete messages
      const deletedMessages = await tx.message.deleteMany({
        where: { clientId: CLIENT_ID },
      });
      log.recordsDeleted.messages = deletedMessages.count;
      console.log(`   ✅ Deleted ${deletedMessages.count} messages`);

      // Delete customers
      const deletedCustomers = await tx.customer.deleteMany({
        where: { clientId: CLIENT_ID },
      });
      log.recordsDeleted.customers = deletedCustomers.count;
      console.log(`   ✅ Deleted ${deletedCustomers.count} customers`);

      // Delete bookings
      const deletedBookings = await tx.booking.deleteMany({
        where: { clientId: CLIENT_ID },
      });
      log.recordsDeleted.bookings = deletedBookings.count;
      console.log(`   ✅ Deleted ${deletedBookings.count} bookings`);

      // Delete conversations
      const deletedConversations = await tx.conversation.deleteMany({
        where: { clientId: CLIENT_ID },
      });
      log.recordsDeleted.conversations = deletedConversations.count;
      console.log(`   ✅ Deleted ${deletedConversations.count} conversations`);

      // Delete leads
      const deletedLeads = await tx.lead.deleteMany({
        where: { clientId: CLIENT_ID },
      });
      log.recordsDeleted.leads = deletedLeads.count;
      console.log(`   ✅ Deleted ${deletedLeads.count} leads`);

      // Delete users
      const deletedUsers = await tx.user.deleteMany({
        where: { clientId: CLIENT_ID },
      });
      log.recordsDeleted.users = deletedUsers.count;
      console.log(`   ✅ Deleted ${deletedUsers.count} users`);

      // Delete alert logs
      const deletedAlerts = await tx.$executeRaw`
        DELETE FROM alert_logs WHERE resource_id = ${CLIENT_ID};
      `;
      log.recordsDeleted.alertLogs = deletedAlerts;
      console.log(`   ✅ Deleted ${deletedAlerts} alert logs`);

      // Delete client
      await tx.$executeRaw`
        DELETE FROM clients WHERE id = ${CLIENT_ID};
      `;
      console.log(`   ✅ Deleted client: ${client.businessName}`);

      return log;
    });

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ [AdminCockpit] CLIENT DELETED SUCCESSFULLY");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("DELETION LOG:");
    console.log(JSON.stringify(deletionLog, null, 2));
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  } catch (error) {
    console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ [AdminCockpit] DELETE FAILED (TRANSACTION ROLLED BACK)");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("Error:", error.message);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } finally {
    await prisma.$disconnect();
  }
})();
