import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helper function to generate random integer between min and max (inclusive)
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to generate random date within a specific day
function randomDateInDay(date: Date): Date {
  const hour = randomInt(8, 20); // Business hours 8am-8pm
  const minute = randomInt(0, 59);
  const second = randomInt(0, 59);

  const result = new Date(date);
  result.setHours(hour, minute, second, 0);
  return result;
}

// Realistic first names and last names
const firstNames = [
  "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph",
  "Emma", "Olivia", "Ava", "Isabella", "Sophia", "Charlotte", "Mia", "Amelia",
  "Sarah", "Jennifer", "Emily", "Jessica", "Ashley", "Hannah", "Madison", "Taylor"
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas",
  "Taylor", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris"
];

// Realistic message content templates
const messageTemplates = [
  "Hi, I'd like to book an appointment",
  "What are your available times this week?",
  "Can I get a quote for your services?",
  "Do you have any availability tomorrow?",
  "I'm interested in your services",
  "What's your pricing like?",
  "Thanks for getting back to me!",
  "Perfect, I'll take that slot",
  "Can you tell me more about what you offer?",
  "I need to reschedule my appointment",
  "What time slots do you have available?",
  "Is there a cancellation fee?",
  "Do you offer weekend appointments?",
  "I was referred by a friend",
  "Can I book for next week?",
  "What areas do you cover?",
  "How long does the service take?",
  "Do you have any special offers?",
  "I'd like to confirm my booking",
  "Can you send me more information?"
];

// Generate UK mobile number
function generateUKPhone(): string {
  return `07${randomInt(100, 999)} ${randomInt(100, 999)}${randomInt(100, 999)}`;
}

// Generate random name
function generateName(): string {
  const first = firstNames[randomInt(0, firstNames.length - 1)];
  const last = lastNames[randomInt(0, lastNames.length - 1)];
  return `${first} ${last}`;
}

// Generate random message
function generateMessage(): string {
  return messageTemplates[randomInt(0, messageTemplates.length - 1)];
}

async function seedClient(client: any) {
  const clientId = client.id;
  const leads: any[] = [];
  const bookings: any[] = [];
  const messages: any[] = [];

  const today = new Date();

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const currentDate = new Date(today);
    currentDate.setDate(currentDate.getDate() - dayOffset);
    currentDate.setHours(0, 0, 0, 0);

    // Apply slight upward trend for last 7 days
    const isRecentWeek = dayOffset < 7;
    const trendMultiplier = isRecentWeek ? 1.3 : 1.0;

    // Generate leads (5-20 per day, more in recent week)
    const leadsCount = Math.floor(randomInt(5, 20) * trendMultiplier);

    for (let i = 0; i < leadsCount; i++) {
      const name = generateName();
      const phone = generateUKPhone();

      leads.push({
        clientId,
        name,
        phone,
        email: `${name.toLowerCase().replace(" ", ".")}@example.com`,
        status: ["NEW", "CONTACTED", "QUALIFIED", "LOST"][randomInt(0, 3)],
        source: "FAKE",
        createdAt: randomDateInDay(currentDate),
      });
    }

    // Generate bookings (0-5 per day, more in recent week)
    const bookingsCount = Math.floor(randomInt(0, 5) * trendMultiplier);

    for (let i = 0; i < bookingsCount; i++) {
      const appointmentStart = new Date(currentDate);
      appointmentStart.setDate(appointmentStart.getDate() + randomInt(1, 14)); // Future appointments
      appointmentStart.setHours(randomInt(9, 17), 0, 0, 0);

      const appointmentEnd = new Date(appointmentStart);
      appointmentEnd.setHours(appointmentStart.getHours() + 1); // 1 hour duration

      bookings.push({
        clientId,
        customerName: generateName(),
        customerPhone: generateUKPhone(),
        customerEmail: `customer${randomInt(1000, 9999)}@example.com`,
        start: appointmentStart,
        end: appointmentEnd,
        status: ["NEW", "CONFIRMED", "CANCELLED"][randomInt(0, 2)],
        createdAt: randomDateInDay(currentDate),
      });
    }

    // Generate messages (10-40 per day, more in recent week)
    const messagesCount = Math.floor(randomInt(10, 40) * trendMultiplier);

    for (let i = 0; i < messagesCount; i++) {
      messages.push({
        clientId,
        direction: ["INBOUND", "OUTBOUND"][randomInt(0, 1)],
        type: "SMS",
        body: generateMessage(),
        createdAt: randomDateInDay(currentDate),
      });
    }
  }

  // Insert all data
  const leadsResult = await prisma.lead.createMany({
    data: leads,
    skipDuplicates: true,
  });

  const bookingsResult = await prisma.booking.createMany({
    data: bookings,
    skipDuplicates: true,
  });

  const messagesResult = await prisma.message.createMany({
    data: messages,
    skipDuplicates: true,
  });

  console.log(
    `  ${client.businessName}: ${leadsResult.count} leads, ${bookingsResult.count} bookings, ${messagesResult.count} messages`
  );
}

async function main() {
  // -------------------------------------------------------
  // CLEAN DATABASE FIRST
  // -------------------------------------------------------
  console.log("🗑️  Cleaning existing data...");
  await prisma.message.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.client.deleteMany({});
  console.log("✅ Database cleaned\n");

  // -------------------------------------------------------
  // CREATE REAL CLIENT + ADMIN ACCOUNTS
  // -------------------------------------------------------

  console.log("🌱 Creating real admin + client accounts...");

  // 1. Create a real client record
  const realClient = await prisma.client.create({
    data: {
      businessName: "Test Service",
      region: "UK",
      phoneNumber: "+447000000000",
      demoToolsVisible: true,   // important for demo mode toggle
    },
  });

  // 2. Create hashed passwords
  const adminPassword = await bcrypt.hash("admin123", 10);
  const clientPassword = await bcrypt.hash("client123", 10);

  // 3. Admin user
  await prisma.user.create({
    data: {
      email: "admin@jobrun.ai",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  // 4. Client user attached to client
  await prisma.user.create({
    data: {
      email: "client@example.com",
      password: clientPassword,
      role: "CLIENT",
      clientId: realClient.id,
    },
  });

  console.log("✅ Real accounts created:");
  console.log("   Admin: admin@jobrun.ai / admin123");
  console.log("   Client: client@example.com / client123");

  console.log("\n🌱 Seeding analytics for ALL clients...\n");

  const clients = await prisma.client.findMany();

  console.log(`Found ${clients.length} client(s). Generating 30 days of data for each...\n`);

  for (const client of clients) {
    await seedClient(client);
  }

  console.log("\n🎉 Seed complete for all clients!\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
