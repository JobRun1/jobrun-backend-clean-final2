import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Creating JobRun Demo Client...');

  // Check if demo client already exists
  const existing = await prisma.client.findFirst({
    where: {
      businessName: 'JobRun Demo Client',
      phoneNumber: '+447476955179',
    },
  });

  if (existing) {
    console.log('⚠️  Demo client already exists:', {
      id: existing.id,
      businessName: existing.businessName,
      phoneNumber: existing.phoneNumber,
    });
    return;
  }

  // Create new demo client
  const demoClient = await prisma.client.create({
    data: {
      businessName: 'JobRun Demo Client',
      region: 'UK',
      phoneNumber: '+447476955179',
      timezone: 'Europe/London',
      businessHours: {
        mon: ['00:00', '23:59'],
        tue: ['00:00', '23:59'],
        wed: ['00:00', '23:59'],
        thu: ['00:00', '23:59'],
        fri: ['00:00', '23:59'],
        sat: ['00:00', '23:59'],
        sun: ['00:00', '23:59'],
      },
      demoToolsVisible: true,
    },
  });

  console.log('✅ Demo client created successfully:', {
    id: demoClient.id,
    businessName: demoClient.businessName,
    phoneNumber: demoClient.phoneNumber,
    region: demoClient.region,
    timezone: demoClient.timezone,
    demoToolsVisible: demoClient.demoToolsVisible,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('🎉 Done!');
  })
  .catch(async (e) => {
    console.error('❌ Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
