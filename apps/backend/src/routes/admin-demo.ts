import { Router } from 'express';
import { prisma } from '../db';
import { sendSuccess, sendError } from '../utils/response';
import { faker } from '@faker-js/faker';
import { CustomerState, MessageDirection, MessageType, BookingStatus } from '@prisma/client';

const router = Router();

/**
 * Get the next demo client number
 */
async function getNextDemoClientNumber(): Promise<number> {
  const demoClients = await prisma.client.findMany({
    where: { demoClient: true },
    select: { businessName: true },
  });

  // Extract numbers from existing demo clients
  const numbers = demoClients
    .map((client) => {
      const match = client.businessName.match(/Demo Client #(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0);

  // Return the next available number
  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}

/**
 * Generate random timestamp within the last N hours
 */
function randomTimestamp(hoursAgo: number): Date {
  const now = Date.now();
  const millisAgo = hoursAgo * 60 * 60 * 1000;
  const randomTime = now - Math.random() * millisAgo;
  return new Date(randomTime);
}

/**
 * Generate sample message bodies
 */
function generateMessageBody(direction: MessageDirection): string {
  if (direction === 'INBOUND') {
    const messages = [
      "Hi, I'm interested in your services. Can you help me?",
      'What are your rates for this week?',
      'Do you have any availability tomorrow?',
      "I'd like to schedule an appointment.",
      'Can you give me a quote?',
      "Yes, I'm available. Let's book it.",
      'That works for me. What time?',
      'Sounds good. Where are you located?',
      'Thank you for the information!',
      "I'll call you back later.",
    ];
    return faker.helpers.arrayElement(messages);
  } else if (direction === 'OUTBOUND') {
    const messages = [
      "Hello! Thanks for your interest. We'd be happy to help!",
      'Our rates start at $150 per session. Would you like to schedule?',
      'We have availability tomorrow at 10am or 2pm. Which works better?',
      "Great! I'll get you scheduled. Can you confirm your address?",
      "I've sent you a booking link. Please let me know if you have questions.",
      "Perfect! You're all set for tomorrow at 10am.",
      'Looking forward to working with you!',
      "We're located at 123 Main St. See you soon!",
      'Thanks for choosing us! Have a great day.',
      "Please don't hesitate to reach out if you need anything else.",
    ];
    return faker.helpers.arrayElement(messages);
  } else {
    // SYSTEM messages
    const messages = [
      'AI: Customer expressed interest in services. Qualification score: 8/10',
      'AI: Appointment confirmed for tomorrow at 10:00 AM',
      'AI: Customer requested pricing information',
      'AI: Follow-up scheduled for next week',
      'AI: Customer marked as qualified lead',
      'AI: Booking link sent successfully',
      'AI: Customer indicated high purchase intent',
      'AI: Conversation handed over to human agent',
    ];
    return faker.helpers.arrayElement(messages);
  }
}

// POST /api/admin/demo/generate
router.post('/generate', async (req, res) => {
  try {
    // Get next demo client number
    const clientNumber = await getNextDemoClientNumber();
    const businessName = `Demo Client #${clientNumber}`;

    // Generate random details
    const region = faker.location.city() + ', ' + faker.location.state({ abbreviated: true });
    const twilioNumber = `+1${faker.string.numeric(10)}`;
    const phoneNumber = `+1${faker.string.numeric(10)}`;
    const timezone = faker.helpers.arrayElement([
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
    ]);

    // Create demo client with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create client
      const client = await tx.client.create({
        data: {
          businessName,
          region,
          timezone,
          twilioNumber,
          phoneNumber,
          demoClient: true,
          demoToolsVisible: true,
        },
      });

      // Generate 3-7 demo customers (leads)
      const customerCount = faker.number.int({ min: 3, max: 7 });
      const customers = [];
      let totalMessages = 0;
      let totalBookings = 0;

      for (let i = 0; i < customerCount; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const customerName = `${firstName} ${lastName}`;
        // Ensure unique phone number by adding timestamp component
        const customerPhone = `+1${faker.string.numeric(9)}${i}`;
        const customerCreatedAt = randomTimestamp(72); // Within last 72 hours

        // Pick random customer state using proper enum
        const customerStates: CustomerState[] = [
          CustomerState.NEW,
          CustomerState.POST_CALL,
          CustomerState.POST_CALL_REPLIED,
          CustomerState.CUSTOMER_REPLIED,
          CustomerState.QUALIFIED,
          CustomerState.BOOKED,
          CustomerState.CONVERTED,
          CustomerState.LOST,
        ];
        const customerState = faker.helpers.arrayElement(customerStates);

        const customer = await tx.customer.create({
          data: {
            clientId: client.id,
            name: customerName,
            phone: customerPhone,
            email: faker.internet.email({ firstName, lastName }).toLowerCase(),
            state: customerState,
            createdAt: customerCreatedAt,
          },
        });

        customers.push(customer);

        // Generate 2-6 messages per customer
        const messageCount = faker.number.int({ min: 2, max: 6 });
        for (let j = 0; j < messageCount; j++) {
          // Pick message direction using proper enum
          const directions: MessageDirection[] = [
            MessageDirection.INBOUND,
            MessageDirection.OUTBOUND,
            MessageDirection.SYSTEM,
            MessageDirection.INBOUND,
            MessageDirection.OUTBOUND, // Weight towards INBOUND/OUTBOUND
          ];
          const direction = faker.helpers.arrayElement(directions);

          // Pick message type using proper enum
          const type: MessageType = direction === MessageDirection.SYSTEM ? MessageType.EVENT : MessageType.SMS;
          const messageBody = generateMessageBody(direction);
          const messageCreatedAt = randomTimestamp(72); // Within last 72 hours

          await tx.message.create({
            data: {
              clientId: client.id,
              customerId: customer.id,
              direction,
              type,
              body: messageBody,
              createdAt: messageCreatedAt,
            },
          });

          totalMessages++;
        }

        // 0-2 bookings per customer
        const bookingCount = faker.number.int({ min: 0, max: 2 });
        for (let k = 0; k < bookingCount; k++) {
          const startDate = faker.date.soon({ days: 14 }); // Next 14 days
          const duration = faker.helpers.arrayElement([30, 60, 90, 120]); // minutes
          const endDate = new Date(startDate.getTime() + duration * 60000);

          // Pick booking status using proper enum
          const statuses: BookingStatus[] = [
            BookingStatus.NEW,
            BookingStatus.CONFIRMED,
            BookingStatus.CONFIRMED,
            BookingStatus.CONFIRMED, // Weight towards CONFIRMED
          ];
          const status = faker.helpers.arrayElement(statuses);

          await tx.booking.create({
            data: {
              clientId: client.id,
              customerId: customer.id,
              start: startDate,
              end: endDate,
              status,
              customerName: customer.name || 'Unknown',
              customerPhone: customer.phone,
              customerEmail: customer.email || undefined,
              notes: faker.helpers.maybe(
                () => faker.lorem.sentence({ min: 3, max: 10 }),
                { probability: 0.5 }
              ) || undefined,
            },
          });

          totalBookings++;
        }
      }

      return { client, customerCount, totalMessages, totalBookings };
    });

    sendSuccess(res, {
      clientId: result.client.id,
      clientName: result.client.businessName,
      numberOfLeads: result.customerCount,
      numberOfMessages: result.totalMessages,
      numberOfBookings: result.totalBookings,
    });
  } catch (error) {
    console.error('Failed to generate demo data:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error,
    });
    sendError(
      res,
      'INTERNAL_ERROR',
      `Failed to generate demo data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
});

// DELETE /api/admin/demo/wipe
router.delete('/wipe', async (req, res) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Find all demo clients
      const demoClients = await tx.client.findMany({
        where: { demoClient: true },
        select: { id: true },
      });

      const demoClientIds = demoClients.map((c) => c.id);

      if (demoClientIds.length === 0) {
        return {
          deletedClients: 0,
          deletedCustomers: 0,
          deletedMessages: 0,
          deletedBookings: 0,
        };
      }

      // Delete all related records in correct order (respect foreign keys)
      // 1. Delete impersonation logs (no CASCADE)
      const deletedImpersonationLogs = await tx.impersonationLog.deleteMany({
        where: { clientId: { in: demoClientIds } },
      });

      // 2. Delete messages
      const deletedMessages = await tx.message.deleteMany({
        where: { clientId: { in: demoClientIds } },
      });

      // 3. Delete bookings
      const deletedBookings = await tx.booking.deleteMany({
        where: { clientId: { in: demoClientIds } },
      });

      // 4. Delete conversations
      const deletedConversations = await tx.conversation.deleteMany({
        where: { clientId: { in: demoClientIds } },
      });

      // 5. Delete customers
      const deletedCustomers = await tx.customer.deleteMany({
        where: { clientId: { in: demoClientIds } },
      });

      // 6. Delete agent logs
      const deletedAgentLogs = await tx.agentLog.deleteMany({
        where: { clientId: { in: demoClientIds } },
      });

      // 7. Delete users
      const deletedUsers = await tx.user.deleteMany({
        where: { clientId: { in: demoClientIds } },
      });

      // 8. Finally, delete the clients themselves
      const deletedClients = await tx.client.deleteMany({
        where: { demoClient: true },
      });

      return {
        deletedClients: deletedClients.count,
        deletedCustomers: deletedCustomers.count,
        deletedMessages: deletedMessages.count,
        deletedBookings: deletedBookings.count,
      };
    });

    sendSuccess(res, result);
  } catch (error) {
    console.error('Failed to wipe demo data:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to wipe demo data', 500);
  }
});

export default router;
