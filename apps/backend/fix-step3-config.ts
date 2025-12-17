import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TWILIO_NUMBER = "+447476955179";
const DEFAULT_CLIENT_ID = "default-client";

async function main() {
  console.log("🔧 STEP 3.1 CONFIGURATION FIX\n");

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: DELETE EXTRA CLIENTS
  // ═══════════════════════════════════════════════════════════════
  console.log("🗑️  Step 1: Deleting extra clients...");

  const allClients = await prisma.client.findMany();
  const clientsToDelete = allClients.filter(c => c.id !== DEFAULT_CLIENT_ID);

  console.log(`   Found ${allClients.length} total clients`);
  console.log(`   Keeping: ${DEFAULT_CLIENT_ID}`);
  console.log(`   Deleting: ${clientsToDelete.length} clients`);

  for (const client of clientsToDelete) {
    await prisma.client.delete({ where: { id: client.id } });
    console.log(`   ✓ Deleted: ${client.businessName} (${client.id})`);
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: UPDATE CLIENT CONFIGURATION
  // ═══════════════════════════════════════════════════════════════
  console.log("\n📝 Step 2: Updating client configuration...");

  const updatedClient = await prisma.client.update({
    where: { id: DEFAULT_CLIENT_ID },
    data: {
      businessName: "JobRun Plumbing Demo",
      region: "UK",
      timezone: "Europe/London",
      phoneNumber: TWILIO_NUMBER,
      twilioNumber: TWILIO_NUMBER,
    }
  });

  console.log("   ✓ Updated client:");
  console.log(`     businessName: ${updatedClient.businessName}`);
  console.log(`     region: ${updatedClient.region}`);
  console.log(`     timezone: ${updatedClient.timezone}`);
  console.log(`     phoneNumber: ${updatedClient.phoneNumber}`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: UPDATE CLIENT SETTINGS WITH SERVICE DEFINITION
  // ═══════════════════════════════════════════════════════════════
  console.log("\n🛠️  Step 3: Creating structured service definition...");

  const serviceDefinition = {
    name: "Emergency Plumbing Repair",
    duration: 60,
    urgency: "High",
    description: "Leaks, burst pipes, no water"
  };

  const updatedSettings = await prisma.clientSettings.update({
    where: { clientId: DEFAULT_CLIENT_ID },
    data: {
      businessName: "JobRun Plumbing Demo",
      phoneNumber: TWILIO_NUMBER,
      // Store service as JSON in metadata
      metadata: {
        bookingUrl: "https://calendly.com/jobrun-plumbing",
        system_version: "v1.0.0",
        ai_pipeline_enabled: true,
        onboarding_complete: true,
        urgent_alert_number: TWILIO_NUMBER,
        booking_link_enabled: true,
        service: serviceDefinition
      },
      // Keep minimal text for backward compatibility
      services: "Emergency Plumbing Repair (60min) - Leaks, burst pipes, no water"
    }
  });

  console.log("   ✓ Created service definition:");
  console.log(`     Name: ${serviceDefinition.name}`);
  console.log(`     Duration: ${serviceDefinition.duration} minutes`);
  console.log(`     Urgency: ${serviceDefinition.urgency}`);
  console.log(`     Description: ${serviceDefinition.description}`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 4: POPULATE WEEKLY AVAILABILITY
  // ═══════════════════════════════════════════════════════════════
  console.log("\n📅 Step 4: Populating weekly availability...");

  // Delete existing availability first
  await prisma.weeklyAvailability.deleteMany({
    where: { clientId: DEFAULT_CLIENT_ID }
  });

  // Create Monday-Friday 09:00-17:00
  const weekdays = [
    { day: 1, name: "Monday" },
    { day: 2, name: "Tuesday" },
    { day: 3, name: "Wednesday" },
    { day: 4, name: "Thursday" },
    { day: 5, name: "Friday" }
  ];

  for (const { day, name } of weekdays) {
    await prisma.weeklyAvailability.create({
      data: {
        clientId: DEFAULT_CLIENT_ID,
        weekday: day,
        startTime: "09:00",
        endTime: "17:00"
      }
    });
    console.log(`   ✓ Created: ${name} 09:00-17:00`);
  }

  // ═══════════════════════════════════════════════════════════════
  // VERIFICATION
  // ═══════════════════════════════════════════════════════════════
  console.log("\n✅ VERIFICATION\n");

  const finalClients = await prisma.client.findMany();
  const finalAvailability = await prisma.weeklyAvailability.findMany({
    where: { clientId: DEFAULT_CLIENT_ID }
  });
  const finalSettings = await prisma.clientSettings.findUnique({
    where: { clientId: DEFAULT_CLIENT_ID }
  });

  console.log("CLIENT CONFIGURATION:");
  console.log(`  ✓ Total clients: ${finalClients.length} (should be 1)`);
  console.log(`  ✓ Business name: ${finalClients[0].businessName}`);
  console.log(`  ✓ Region: ${finalClients[0].region}`);
  console.log(`  ✓ Timezone: ${finalClients[0].timezone}`);
  console.log(`  ✓ Phone number: ${finalClients[0].phoneNumber}`);

  console.log("\nSERVICE CONFIGURATION:");
  const service = (finalSettings?.metadata as any)?.service;
  if (service) {
    console.log(`  ✓ Name: ${service.name}`);
    console.log(`  ✓ Duration: ${service.duration} minutes`);
    console.log(`  ✓ Urgency: ${service.urgency}`);
    console.log(`  ✓ Description: ${service.description}`);
  }

  console.log("\nAVAILABILITY CONFIGURATION:");
  console.log(`  ✓ Total slots: ${finalAvailability.length} (should be 5)`);
  finalAvailability.forEach(slot => {
    const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][slot.weekday];
    console.log(`  ✓ ${dayName}: ${slot.startTime}-${slot.endTime}`);
  });

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ CONFIGURATION FIX COMPLETE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Error during configuration fix:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
