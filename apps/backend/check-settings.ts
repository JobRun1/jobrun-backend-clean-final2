import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const settings = await prisma.clientSettings.findMany();
  console.log(JSON.stringify(settings, null, 2));
  await prisma.$disconnect();
}

check();
