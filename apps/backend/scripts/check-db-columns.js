const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Query information_schema to see what columns actually exist in the clients table
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'clients'
      ORDER BY ordinal_position;
    `;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('CLIENTS TABLE COLUMNS IN DATABASE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    columns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)';
      console.log(`${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${nullable}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Check specifically for the fields we need
    const hasOnboardingComplete = columns.some(c => c.column_name === 'onboardingComplete');
    const hasPaymentActive = columns.some(c => c.column_name === 'paymentActive');
    const hasOpsAlertsMuted = columns.some(c => c.column_name === 'opsAlertsMuted');

    console.log('\nCRITICAL FIELDS CHECK:');
    console.log('onboardingComplete:', hasOnboardingComplete ? '✅ EXISTS' : '❌ MISSING');
    console.log('paymentActive:', hasPaymentActive ? '✅ EXISTS' : '❌ MISSING');
    console.log('opsAlertsMuted:', hasOpsAlertsMuted ? '✅ EXISTS' : '❌ MISSING');

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
