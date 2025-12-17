import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const customerPhone = "+447700900123";
  const clientId = "default-client";

  console.log("STEP 3 DATABASE EVIDENCE EXTRACTION");
  console.log("====================================\n");

  // 1. Customer Record
  console.log("1. CUSTOMER RECORD");
  console.log("------------------");
  const customer = await prisma.customer.findFirst({
    where: { clientId, phone: customerPhone },
  });
  console.log(JSON.stringify(customer, null, 2));

  if (!customer) {
    console.log("❌ No customer found");
    return;
  }

  // 2. Conversation Record
  console.log("\n2. CONVERSATION RECORD");
  console.log("----------------------");
  const conversation = await prisma.conversation.findFirst({
    where: { clientId, customerId: customer.id },
  });
  console.log(JSON.stringify(conversation, null, 2));

  // 3. Message Records
  console.log("\n3. MESSAGE RECORDS");
  console.log("------------------");
  const messages = await prisma.message.findMany({
    where: { clientId, customerId: customer.id },
    orderBy: { createdAt: "asc" },
  });
  console.log(JSON.stringify(messages, null, 2));

  // 4. Lead Record
  console.log("\n4. LEAD RECORD");
  console.log("--------------");
  const lead = await prisma.lead.findFirst({
    where: { clientId, customerId: customer.id },
  });
  console.log(JSON.stringify(lead, null, 2));

  // 5. Summary
  console.log("\n5. SUMMARY");
  console.log("----------");
  console.log(`Customer ID: ${customer.id}`);
  console.log(`Customer State: ${customer.state}`);
  console.log(`Conversation ID: ${conversation?.id}`);
  console.log(`Message Count: ${messages.length}`);
  console.log(`Lead ID: ${lead?.id}`);
  console.log(`Lead State: ${lead?.state}`);
  console.log(`Job Type: ${lead?.jobType}`);
  console.log(`Urgency: ${lead?.urgency}`);
  console.log(`Requested Time: ${lead?.requestedTime}`);
  console.log(`Escalated: ${lead?.escalated}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
