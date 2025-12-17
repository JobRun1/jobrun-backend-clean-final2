#!/usr/bin/env ts-node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBootstrap() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('BOOTSTRAP VERIFICATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Check 1: Client exists
    const client = await prisma.client.findUnique({
      where: { id: 'default-client' }
    });

    if (client) {
      console.log('✅ Client exists');
      console.log(`   ID: ${client.id}`);
      console.log(`   Business: ${client.businessName}`);
      console.log(`   Region: ${client.region}`);
      console.log(`   Timezone: ${client.timezone}`);
    } else {
      console.log('❌ Client missing');
      process.exit(1);
    }

    // Check 2: Client settings exist
    const settings = await prisma.clientSettings.findUnique({
      where: { clientId: 'default-client' }
    });

    if (settings) {
      console.log('\n✅ Client settings exist');
      console.log(`   Client ID: ${settings.clientId}`);
      console.log(`   Business: ${settings.businessName}`);
      console.log(`   Email: ${settings.email}`);

      const metadata = settings.metadata as any;
      if (metadata?.bookingUrl) {
        console.log(`\n✅ Booking URL valid`);
        console.log(`   URL: ${metadata.bookingUrl}`);
        console.log(`   Alert Number: ${metadata.urgent_alert_number}`);
        console.log(`   AI Pipeline: ${metadata.ai_pipeline_enabled}`);
      } else {
        console.log('\n❌ Booking URL missing or invalid');
        process.exit(1);
      }
    } else {
      console.log('\n❌ Client settings missing');
      process.exit(1);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ BOOTSTRAP VERIFICATION COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkBootstrap();
