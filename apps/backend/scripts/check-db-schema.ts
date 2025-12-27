/**
 * Check current database schema for alert_logs and twilio_number_pool
 */

import { prisma } from '../src/db';

async function checkSchema() {
  console.log('Checking database schema...\n');

  try {
    // Check alert_logs table
    const alertLogsColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'alert_logs'
      ORDER BY ordinal_position;
    `;
    console.log('📋 alert_logs table columns:');
    console.log(alertLogsColumns);
    console.log('');

    // Check twilio_number_pool table
    const poolColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'twilio_number_pool'
      ORDER BY ordinal_position;
    `;
    console.log('📋 twilio_number_pool table columns:');
    console.log(poolColumns);
    console.log('');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();
