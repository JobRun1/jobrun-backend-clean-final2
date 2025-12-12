import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RAILWAY PRODUCTION SEED SCRIPT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Purpose: Create default client and settings for production deployment
// Safe: Idempotent - can be run multiple times without errors
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function seedRailwayProduction() {
  console.log("🌱 Seeding Railway Production Database...\n");

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CONFIGURATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const defaultClientId = "default-client";
  const twilioNumber = process.env.TWILIO_NUMBER || "+15555551234";
  const urgentAlertNumber = process.env.URGENT_ALERT_NUMBER || twilioNumber;
  const bookingUrl = process.env.BOOKING_URL || "https://calendly.com/jobrun-test";

  // Validate Twilio number format
  if (!twilioNumber.match(/^\+1[0-9]{10}$/)) {
    console.error("❌ Invalid TWILIO_NUMBER format. Must be E.164: +1XXXXXXXXXX");
    console.error(`   Current value: ${twilioNumber}`);
    process.exit(1);
  }

  console.log("📋 Configuration:");
  console.log(`   Client ID: ${defaultClientId}`);
  console.log(`   Twilio Number: ${twilioNumber}`);
  console.log(`   Alert Number: ${urgentAlertNumber}`);
  console.log(`   Booking URL: ${bookingUrl}\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. CREATE DEFAULT CLIENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
  } else {
    console.log("✨ Creating new default client...");
    client = await prisma.client.create({
      data: {
        id: defaultClientId, // CRITICAL: Fixed ID to match DEFAULT_CLIENT_ID env var
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

  const metadataObject = {
    bookingUrl: bookingUrl,
    urgent_alert_number: urgentAlertNumber,
    booking_link_enabled: true,
    onboarding_complete: true,
  };

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
        metadata: metadataObject,
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
        metadata: metadataObject,
      },
    });
  }

  console.log(`✅ Client settings created`);
  console.log(`   Booking URL: ${bookingUrl}`);
  console.log(`   Alert Number: ${urgentAlertNumber}`);
  console.log(`   Booking Enabled: true\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. VERIFICATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log("🔍 Verifying database records...");

  // Verify client exists
  const verifyClient = await prisma.client.findUnique({
    where: { id: defaultClientId },
    include: { leads: true, customers: true, messages: true },
  });

  if (!verifyClient) {
    console.error("❌ Verification failed: Client not found");
    process.exit(1);
  }

  // Verify settings exist
  const verifySettings = await prisma.clientSettings.findUnique({
    where: { clientId: defaultClientId },
  });

  if (!verifySettings) {
    console.error("❌ Verification failed: ClientSettings not found");
    process.exit(1);
  }

  // Check metadata structure
  if (
    !verifySettings.metadata ||
    typeof verifySettings.metadata !== "object" ||
    !("bookingUrl" in verifySettings.metadata)
  ) {
    console.error("❌ Verification failed: metadata.bookingUrl missing");
    process.exit(1);
  }

  console.log("✅ All records verified");
  console.log(`   Client record: ✓`);
  console.log(`   Client settings: ✓`);
  console.log(`   Metadata structure: ✓`);
  console.log(`   Booking URL: ✓\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. SUMMARY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ RAILWAY PRODUCTION SEED COMPLETE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("📊 Summary:");
  console.log(`   Default Client ID: ${defaultClientId}`);
  console.log(`   Business Name: ${verifyClient.businessName}`);
  console.log(`   Twilio Number: ${verifyClient.twilioNumber}`);
  console.log(`   Alert Number: ${verifyClient.phoneNumber}`);
  console.log(`   Booking URL: ${(verifySettings.metadata as any).bookingUrl}`);
  console.log(`   Existing Customers: ${verifyClient.customers.length}`);
  console.log(`   Existing Leads: ${verifyClient.leads.length}`);
  console.log(`   Existing Messages: ${verifyClient.messages.length}`);
  console.log();

  console.log("🚀 Next Steps:");
  console.log("   1. Verify backend logs show no errors");
  console.log("   2. Ensure DEFAULT_CLIENT_ID env var = 'default-client'");
  console.log("   3. Test Twilio webhook: Send SMS to your Twilio number");
  console.log("   4. Expected: AI pipeline executes successfully");
  console.log("   5. Check Railway logs for pipeline execution");
  console.log("   6. Visit dashboard to verify client appears");
  console.log();

  console.log("🔧 Twilio Webhook Configuration:");
  console.log("   Webhook URL: https://your-backend.railway.app/twilio/sms");
  console.log("   Method: POST");
  console.log("   Expected response: TwiML");
  console.log();

  console.log("💡 Test Command:");
  console.log(`   Send SMS: "Hi, I need help" to ${verifyClient.twilioNumber}`);
  console.log("   Expected: AI responds with booking link + clarification");
  console.log();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXECUTE SEED
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

seedRailwayProduction()
  .catch((e) => {
    console.error("\n❌ Seeding failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
