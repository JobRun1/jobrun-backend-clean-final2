const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const clientId = 'cmjj6xyxm0006kih7xpsoe80m';

  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('MUTING ALERTS FOR CLIENT (RAW SQL)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Client ID:', clientId);
    console.log('');

    // Update opsAlertsMuted to true using raw SQL
    const result = await prisma.$executeRaw`
      UPDATE clients
      SET "opsAlertsMuted" = true
      WHERE id = ${clientId};
    `;

    console.log('✅ Update successful! Rows affected:', result);
    console.log('');

    // Verify the update
    const client = await prisma.$queryRaw`
      SELECT "businessName", "opsAlertsMuted"
      FROM clients
      WHERE id = ${clientId};
    `;

    if (client && client.length > 0) {
      console.log('VERIFICATION:');
      console.log('Business Name:', client[0].businessName);
      console.log('opsAlertsMuted:', client[0].opsAlertsMuted);
      console.log('');
      console.log(client[0].opsAlertsMuted ? '✅ ALERTS MUTED' : '❌ MUTE FAILED');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
