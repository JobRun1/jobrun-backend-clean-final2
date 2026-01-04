import { prisma } from '../src/db';

async function audit() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('DATABASE STATE AUDIT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Existing clients
  const clients = await prisma.client.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      businessName: true,
      phoneNumber: true,
      twilioNumber: true,
      region: true,
    }
  });

  console.log('EXISTING CLIENTS:');
  if (clients.length === 0) {
    console.log('  (none)');
  } else {
    clients.forEach(c => {
      console.log(`  - ${c.businessName}`);
      console.log(`    Owner Phone: ${c.phoneNumber}`);
      console.log(`    Twilio Number: ${c.twilioNumber || 'NOT ASSIGNED'}`);
      console.log(`    Region: ${c.region}`);
      console.log();
    });
  }

  // Twilio number pool
  const pool = await prisma.twilioNumberPool.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      phoneE164: true,
      role: true,
      status: true,
      clientId: true,
    }
  });

  console.log('\nTWILIO NUMBER POOL:');
  if (pool.length === 0) {
    console.log('  (empty - no numbers in pool)');
  } else {
    pool.forEach(p => {
      console.log(`  - ${p.phoneE164}`);
      console.log(`    Role: ${p.role}`);
      console.log(`    Status: ${p.status}`);
      console.log(`    Client: ${p.clientId || 'UNASSIGNED'}`);
      console.log();
    });
  }

  await prisma.$disconnect();
}

audit().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
