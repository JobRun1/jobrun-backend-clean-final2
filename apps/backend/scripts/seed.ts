import { PrismaClient, LeadStatus, LeadSource, BookingStatus, MessageDirection, MessageType } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

/**
 * Utility helpers
 */
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = <T>(arr: T[]) => arr[rand(0, arr.length - 1)];

/**
 * Create a realistic US phone number
 */
const randomPhone = () =>
  `+1${faker.string.numeric(10)}`;

/**
 * Lead state distribution for realism
 */
const LEAD_STATUSES: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.QUALIFIED,
  LeadStatus.CONVERTED,
  LeadStatus.LOST,
];

/**
 * Message templates for realistic chat history
 */
const MESSAGE_TEMPLATES = {
  inbound: [
    "Hi, I’d like more information!",
    "Can you help me with a booking?",
    "Is tomorrow available?",
    "What’s the price?",
    "Can you call me back?",
  ],
  outbound: [
    "Sure! I’d be happy to help.",
    "Thanks for reaching out!",
    "We have availability tomorrow.",
    "Can you share more details?",
    "I can help you with that!",
  ],
};

async function main() {
  console.log("🌱 Seeding database…");

  // ---------------------------------------
  // CLEAR EXISTING DATA
  // ---------------------------------------
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.handoverState.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.clientSettings.deleteMany({});
  await prisma.client.deleteMany({});

  console.log("🧹 Cleared existing data.");

  // ---------------------------------------
  // CREATE CLIENTS
  // ---------------------------------------
  const clients = [];
  const numClients = 12;

  for (let i = 0; i < numClients; i++) {
    const client = await prisma.client.create({
      data: {
        businessName: faker.company.name(),
        region: faker.location.city(),
        phoneNumber: randomPhone(),
        timezone: "America/New_York",
      },
    });

    clients.push(client);
  }

  console.log(`🏢 Created ${clients.length} clients.`);

  // ---------------------------------------
  // CREATE LEADS, CUSTOMERS, CONVERSATIONS, MESSAGES
  // ---------------------------------------
  let totalLeads = 0;
  let totalMessages = 0;

  for (const client of clients) {
    // 3–6 leads per client
    const numLeads = rand(3, 6);

    for (let i = 0; i < numLeads; i++) {
      const leadPhone = randomPhone();
      const customerName = faker.person.fullName();
      const customerEmail = faker.internet.email();

      // Create Lead
      const lead = await prisma.lead.create({
        data: {
          clientId: client.id,
          phone: leadPhone,
          name: customerName,
          email: customerEmail,
          status: pick(LEAD_STATUSES),
          source: LeadSource.INBOUND,
        },
      });

      totalLeads++;

      // Create Customer
      const customer = await prisma.customer.create({
        data: {
          clientId: client.id,
          phone: leadPhone,
          name: customerName,
          email: customerEmail,
        },
      });

      // Create Conversation
      const conversation = await prisma.conversation.create({
        data: {
          clientId: client.id,
          customerId: customer.id,
        },
      });

      // Create Messages
      const messageCount = rand(3, 8);
      for (let m = 0; m < messageCount; m++) {
        const inbound = m % 2 === 0;

        await prisma.message.create({
          data: {
            clientId: client.id,
            customerId: customer.id,
            conversationId: conversation.id,
            direction: inbound ? MessageDirection.INBOUND : MessageDirection.OUTBOUND,
            type: MessageType.SMS,
            body: inbound
              ? pick(MESSAGE_TEMPLATES.inbound)
              : pick(MESSAGE_TEMPLATES.outbound),
            createdAt: faker.date.recent({ days: 30 }),
          },
        });

        totalMessages++;
      }
    }
  }

  console.log(`📞 Created ${totalLeads} leads.`);
  console.log(`💬 Created ${totalMessages} messages.`);

  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
