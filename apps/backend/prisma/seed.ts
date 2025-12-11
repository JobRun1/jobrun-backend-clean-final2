import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function randomPhone(): string {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const lineNumber = Math.floor(Math.random() * 9000) + 1000;
  return `+1${areaCode}${prefix}${lineNumber}`;
}

const firstNames = [
  "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
  "William", "Barbara", "David", "Elizabeth", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
  "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
  "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle"
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
  "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
  "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young"
];

function randomName(): string {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${lastName}`;
}

function randomEmail(name: string): string {
  const domain = ["gmail.com", "yahoo.com", "outlook.com", "icloud.com", "hotmail.com"];
  const cleanName = name.toLowerCase().replace(/\s+/g, ".");
  const randomDomain = domain[Math.floor(Math.random() * domain.length)];
  return `${cleanName}@${randomDomain}`;
}

function randomDate(daysAgo: number, daysForward: number = 0): Date {
  const now = new Date();
  const randomDays = Math.floor(Math.random() * (daysAgo + daysForward)) - daysAgo;
  const date = new Date(now);
  date.setDate(date.getDate() + randomDays);
  date.setHours(Math.floor(Math.random() * 24));
  date.setMinutes(Math.floor(Math.random() * 60));
  return date;
}

const inboundMessages = [
  "Hi, I'm interested in your services",
  "Do you have availability this week?",
  "What are your rates?",
  "Can you help me with a project?",
  "I need a quote for some work",
  "Are you available tomorrow?",
  "I'd like to schedule an appointment",
  "Can you give me more information?",
  "Yes, that works for me",
  "Thanks for getting back to me",
  "I'm ready to book",
  "What time slots do you have open?",
  "I need this done ASAP",
  "Can you come out today?",
  "How much would that cost?",
  "Do you offer free estimates?",
  "I saw your ad online",
  "A friend recommended you",
  "I have an emergency situation",
  "Can you call me back?"
];

const outboundMessages = [
  "Thanks for reaching out! I'd be happy to help.",
  "We have availability this week. What day works best for you?",
  "Our rates start at $150/hour. Can I get more details about your project?",
  "I can definitely help with that. Let me ask you a few questions.",
  "I'd be happy to provide a quote. Can you tell me more about what you need?",
  "I have a slot open tomorrow at 2pm. Does that work?",
  "Great! I have you scheduled for Thursday at 10am.",
  "Of course! What would you like to know?",
  "Perfect! I'll send you a confirmation shortly.",
  "You're welcome! Looking forward to working with you.",
  "Excellent! I'll prepare everything and see you then.",
  "I have 9am, 2pm, or 4pm available. Which works best?",
  "I can definitely prioritize your request. Let me check my schedule.",
  "I have a cancellation today at 3pm if that helps.",
  "For a project like that, I'd estimate around $500-700.",
  "Yes, we offer free estimates! When would be a good time to come by?",
  "Thanks for finding us! How can I help you today?",
  "I appreciate the referral! Tell me about your needs.",
  "I understand it's urgent. I can be there within 2 hours.",
  "I'll give you a call in the next 15 minutes."
];

function randomInboundMessage(): string {
  return inboundMessages[Math.floor(Math.random() * inboundMessages.length)];
}

function randomOutboundMessage(): string {
  return outboundMessages[Math.floor(Math.random() * outboundMessages.length)];
}

function weightedRandomCustomerState(): "NEW" | "QUALIFIED" | "BOOKED" | "CONVERTED" | "LOST" {
  const rand = Math.random();
  if (rand < 0.25) return "NEW";
  if (rand < 0.50) return "QUALIFIED";
  if (rand < 0.70) return "BOOKED";
  if (rand < 0.85) return "CONVERTED";
  return "LOST";
}

function weightedRandomLeadStatus(): "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "LOST" {
  const rand = Math.random();
  if (rand < 0.30) return "NEW";
  if (rand < 0.55) return "CONTACTED";
  if (rand < 0.75) return "QUALIFIED";
  if (rand < 0.90) return "CONVERTED";
  return "LOST";
}

function weightedRandomBookingStatus(): "NEW" | "CONFIRMED" | "CANCELLED" | "MISSED" | "RESCHEDULED" {
  const rand = Math.random();
  if (rand < 0.15) return "NEW";
  if (rand < 0.70) return "CONFIRMED";
  if (rand < 0.85) return "RESCHEDULED";
  if (rand < 0.95) return "CANCELLED";
  return "MISSED";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN SEED FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log("🌱 Starting database seed...\n");

  // Clear existing data
  console.log("🗑️  Clearing existing data...");
  await prisma.agentLog.deleteMany();
  await prisma.handoverState.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.clientSettings.deleteMany();
  await prisma.user.deleteMany();
  await prisma.client.deleteMany();
  console.log("✓ Cleared existing data\n");

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CREATE CLIENTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log("🏢 Creating clients...");

  const client1 = await prisma.client.create({
    data: {
      businessName: "Elite Plumbing Services",
      region: "San Francisco Bay Area",
      phoneNumber: "+14155551000",
      timezone: "America/Los_Angeles",
      demoToolsVisible: true,
      businessHours: {
        monday: { open: "08:00", close: "18:00" },
        tuesday: { open: "08:00", close: "18:00" },
        wednesday: { open: "08:00", close: "18:00" },
        thursday: { open: "08:00", close: "18:00" },
        friday: { open: "08:00", close: "18:00" },
        saturday: { open: "09:00", close: "15:00" },
        sunday: { closed: true }
      }
    }
  });

  const client2 = await prisma.client.create({
    data: {
      businessName: "ProHome HVAC Solutions",
      region: "Austin, TX",
      phoneNumber: "+15125552000",
      timezone: "America/Chicago",
      demoToolsVisible: true,
      businessHours: {
        monday: { open: "07:00", close: "19:00" },
        tuesday: { open: "07:00", close: "19:00" },
        wednesday: { open: "07:00", close: "19:00" },
        thursday: { open: "07:00", close: "19:00" },
        friday: { open: "07:00", close: "19:00" },
        saturday: { open: "08:00", close: "16:00" },
        sunday: { closed: true }
      }
    }
  });

  const client3 = await prisma.client.create({
    data: {
      businessName: "Sparkle Clean Detailing",
      region: "Miami, FL",
      phoneNumber: "+13055553000",
      timezone: "America/New_York",
      demoToolsVisible: true,
      businessHours: {
        monday: { open: "08:00", close: "18:00" },
        tuesday: { open: "08:00", close: "18:00" },
        wednesday: { open: "08:00", close: "18:00" },
        thursday: { open: "08:00", close: "18:00" },
        friday: { open: "08:00", close: "18:00" },
        saturday: { open: "09:00", close: "17:00" },
        sunday: { open: "10:00", close: "14:00" }
      }
    }
  });

  const clients = [client1, client2, client3];
  console.log(`✓ Created ${clients.length} clients\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CREATE CLIENT SETTINGS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log("⚙️  Creating client settings...");

  await prisma.clientSettings.create({
    data: {
      clientId: client1.id,
      businessName: "Elite Plumbing Services",
      services: "Residential & Commercial Plumbing, Emergency Repairs, Water Heater Installation",
      availability: "Monday-Friday 8am-6pm, Saturday 9am-3pm",
      pricing: "Service call: $95, Hourly rate: $150",
      phoneNumber: client1.phoneNumber!,
      email: "contact@eliteplumbing.com",
      website: "https://eliteplumbing.com",
      serviceArea: "San Francisco Bay Area - 30 mile radius"
    }
  });

  await prisma.clientSettings.create({
    data: {
      clientId: client2.id,
      businessName: "ProHome HVAC Solutions",
      services: "AC Installation, Heating Repair, Maintenance Plans, Air Quality Testing",
      availability: "Monday-Friday 7am-7pm, Saturday 8am-4pm",
      pricing: "Diagnostic: $79, Service: $125/hr",
      phoneNumber: client2.phoneNumber!,
      email: "info@prohomehvac.com",
      website: "https://prohomehvac.com",
      serviceArea: "Greater Austin area"
    }
  });

  await prisma.clientSettings.create({
    data: {
      clientId: client3.id,
      businessName: "Sparkle Clean Detailing",
      services: "Interior & Exterior Detailing, Paint Correction, Ceramic Coating",
      availability: "Monday-Saturday 8am-6pm, Sunday 10am-2pm",
      pricing: "Basic Detail: $149, Premium: $249, Ultimate: $399",
      phoneNumber: client3.phoneNumber!,
      email: "book@sparkleclean.com",
      website: "https://sparkleclean.com",
      serviceArea: "Miami-Dade County"
    }
  });

  console.log("✓ Created client settings\n");

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CREATE CUSTOMERS, CONVERSATIONS, MESSAGES, LEADS, BOOKINGS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  let totalCustomers = 0;
  let totalConversations = 0;
  let totalMessages = 0;
  let totalLeads = 0;
  let totalBookings = 0;

  for (const client of clients) {
    console.log(`👥 Seeding data for ${client.businessName}...`);

    // Create 30 customers per client
    const customersPerClient = 30;

    for (let i = 0; i < customersPerClient; i++) {
      const customerName = randomName();
      const customerPhone = randomPhone();
      const customerState = weightedRandomCustomerState();
      const createdAt = randomDate(60, 0); // Created within last 60 days

      // Create customer
      const customer = await prisma.customer.create({
        data: {
          clientId: client.id,
          phone: customerPhone,
          name: customerName,
          email: Math.random() > 0.3 ? randomEmail(customerName) : null,
          state: customerState,
          createdAt: createdAt
        }
      });
      totalCustomers++;

      // Create conversation for this customer
      const conversation = await prisma.conversation.create({
        data: {
          clientId: client.id,
          customerId: customer.id,
          createdAt: createdAt
        }
      });
      totalConversations++;

      // Create messages (between 2-8 messages per customer)
      const messageCount = Math.floor(Math.random() * 7) + 2;
      let messageDate = new Date(createdAt);

      for (let j = 0; j < messageCount; j++) {
        const isInbound = j % 2 === 0; // Alternate between inbound and outbound

        // Add some time between messages (minutes to hours)
        messageDate = new Date(messageDate.getTime() + (Math.random() * 3600000 * 3));

        await prisma.message.create({
          data: {
            clientId: client.id,
            customerId: customer.id,
            conversationId: conversation.id,
            direction: isInbound ? "INBOUND" : "OUTBOUND",
            type: "SMS",
            body: isInbound ? randomInboundMessage() : randomOutboundMessage(),
            createdAt: messageDate
          }
        });
        totalMessages++;
      }

      // Create a lead for some customers (about 75% of customers)
      if (Math.random() < 0.75) {
        await prisma.lead.create({
          data: {
            clientId: client.id,
            phone: customerPhone,
            name: customerName,
            email: customer.email,
            source: Math.random() > 0.7 ? "REFERRAL" : "INBOUND",
            status: weightedRandomLeadStatus(),
            createdAt: createdAt,
            notes: Math.random() > 0.5 ? "Interested in services, follow up scheduled" : null
          }
        });
        totalLeads++;
      }

      // Create bookings for BOOKED and CONVERTED customers (about 50% chance)
      if ((customerState === "BOOKED" || customerState === "CONVERTED") && Math.random() > 0.5) {
        // Determine if booking is in the past or future
        const isPastBooking = Math.random() > 0.4; // 60% past, 40% future
        const bookingStart = isPastBooking
          ? randomDate(30, 0) // Past 30 days
          : randomDate(-7, 30); // Next 7-30 days

        const bookingEnd = new Date(bookingStart);
        bookingEnd.setHours(bookingStart.getHours() + 2); // 2-hour booking

        await prisma.booking.create({
          data: {
            clientId: client.id,
            customerId: customer.id,
            start: bookingStart,
            end: bookingEnd,
            status: weightedRandomBookingStatus(),
            customerName: customerName,
            customerPhone: customerPhone,
            customerEmail: customer.email,
            notes: Math.random() > 0.6 ? "Customer requested morning appointment" : null
          }
        });
        totalBookings++;
      }
    }

    console.log(`  ✓ Created ${customersPerClient} customers with conversations and messages`);
  }

  console.log();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CREATE AGENT LOGS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log("🤖 Creating agent logs...");

  const agentNames = [
    "QualificationAgent",
    "BookingAgent",
    "ResponseAgent",
    "HandoverAgent",
    "FollowUpAgent"
  ];

  const triggers = [
    "inbound_sms",
    "outbound_call",
    "booking_request",
    "qualification_check",
    "follow_up_scheduled"
  ];

  for (let i = 0; i < 30; i++) {
    const client = clients[Math.floor(Math.random() * clients.length)];
    const agentName = agentNames[Math.floor(Math.random() * agentNames.length)];
    const trigger = triggers[Math.floor(Math.random() * triggers.length)];

    await prisma.agentLog.create({
      data: {
        agentName,
        clientId: client.id,
        trigger,
        input: {
          message: "Customer inquiry received",
          context: "Customer asking about availability"
        },
        output: {
          response: "Sent availability options",
          action: "scheduled_followup"
        },
        executionTimeMs: Math.floor(Math.random() * 5000) + 100,
        createdAt: randomDate(14, 0)
      }
    });
  }

  console.log("✓ Created 30 agent logs\n");

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SUMMARY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ DATABASE SEEDING COMPLETED!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("📊 Summary:");
  console.log(`   Clients:        ${clients.length}`);
  console.log(`   Customers:      ${totalCustomers}`);
  console.log(`   Conversations:  ${totalConversations}`);
  console.log(`   Messages:       ${totalMessages}`);
  console.log(`   Leads:          ${totalLeads}`);
  console.log(`   Bookings:       ${totalBookings}`);
  console.log(`   Agent Logs:     30`);
  console.log();

  console.log("🎯 Your admin dashboard should now display:");
  console.log(`   ✓ Total Clients: ${clients.length}`);
  console.log(`   ✓ Total Leads: ${totalLeads}`);
  console.log(`   ✓ Total Messages: ${totalMessages}`);
  console.log(`   ✓ Total Bookings: ${totalBookings}`);
  console.log(`   ✓ Recent Activity (latest ${Math.min(10, totalMessages)} messages)`);
  console.log(`   ✓ Top Clients by activity`);
  console.log(`   ✓ Lead State Distribution across all states`);
  console.log();

  console.log("🚀 Next steps:");
  console.log("   1. Start your backend: npm run dev");
  console.log("   2. Start your dashboard: cd ../dashboard && npm run dev");
  console.log("   3. Visit: http://localhost:3000/admin");
  console.log();
  console.log("💡 To reseed: npm run seed");
  console.log();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXECUTE SEED
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

main()
  .catch((e) => {
    console.error("\n❌ Error during seeding:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
