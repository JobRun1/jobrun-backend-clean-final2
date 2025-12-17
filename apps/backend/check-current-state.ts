import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Check clients
  const clients = await prisma.client.findMany();
  console.log("=== CLIENTS ===");
  console.log(JSON.stringify(clients, null, 2));

  // Check weekly availability
  const availability = await prisma.weeklyAvailability.findMany();
  console.log("\n=== WEEKLY AVAILABILITY ===");
  console.log(JSON.stringify(availability, null, 2));

  // Check client settings
  const clientSettings = await prisma.clientSettings.findMany();
  console.log("\n=== CLIENT SETTINGS ===");
  console.log(JSON.stringify(clientSettings, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
