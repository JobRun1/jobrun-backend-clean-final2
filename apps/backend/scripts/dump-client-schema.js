const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Get all columns from clients table
    const columns = await prisma.$queryRaw`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'clients'
      ORDER BY ordinal_position;
    `;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('CLIENTS TABLE — LIVE DATABASE SCHEMA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    columns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'optional' : 'required';
      const defaultVal = col.column_default ? ` (default: ${col.column_default})` : '';
      console.log(`${col.column_name}`);
      console.log(`  Type: ${col.data_type}`);
      console.log(`  Nullable: ${nullable}${defaultVal}`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('CRITICAL FIELDS FOR ADMIN ENDPOINTS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const criticalFields = [
      'paymentActive',
      'opsAlertsMuted',
      'paymentGateAlertedAt',
      'paymentGateAlertCount',
      'trialStartedAt',
      'trialEndsAt',
      'stripeCustomerId',
      'stripeSubscriptionId'
    ];

    criticalFields.forEach(field => {
      const col = columns.find(c => c.column_name === field);
      if (col) {
        console.log(`✅ ${field} — EXISTS`);
      } else {
        console.log(`❌ ${field} — MISSING FROM DATABASE`);
      }
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
