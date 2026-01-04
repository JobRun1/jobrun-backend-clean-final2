import { prisma } from '../src/db';

async function verifyClient() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('OPERATIONAL CLIENT VERIFICATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Find FastFix client
  const client = await prisma.client.findFirst({
    where: {
      businessName: 'FastFix Plumbing & Heating'
    },
    include: {
      billing: true,
      controls: true,
    }
  });

  if (!client) {
    console.error('❌ Client not found');
    process.exit(1);
  }

  console.log('CLIENT RECORD:');
  console.log(`  ID: ${client.id}`);
  console.log(`  Business Name: ${client.businessName}`);
  console.log(`  Owner Phone: ${client.phoneNumber}`);
  console.log(`  Twilio Number: ${client.twilioNumber}`);
  console.log(`  Region: ${client.region}`);
  console.log();

  console.log('BILLING:');
  if (client.billing) {
    console.log(`  Status: ${client.billing.status}`);
    console.log(`  Payment Source: ${client.billing.paymentSource}`);
  } else {
    console.log('  ❌ NO BILLING RECORD');
  }
  console.log();

  console.log('CONTROLS:');
  if (client.controls) {
    console.log(`  Outbound Paused: ${client.controls.outboundPaused}`);
    console.log(`  AI Disabled: ${client.controls.aiDisabled}`);
  } else {
    console.log('  ❌ NO CONTROLS RECORD');
  }
  console.log();

  // Check ClientSettings
  const settings = await prisma.clientSettings.findUnique({
    where: { clientId: client.id }
  });

  console.log('CLIENT SETTINGS:');
  if (settings) {
    console.log(`  Business Name: ${settings.businessName}`);
    console.log(`  Services: ${settings.services}`);
    console.log(`  Phone: ${settings.phoneNumber}`);
  } else {
    console.log('  ❌ NO SETTINGS RECORD');
  }
  console.log();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('READINESS CHECK:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const checks = {
    'Has Twilio Number': !!client.twilioNumber,
    'Has Owner Phone': !!client.phoneNumber,
    'Has Billing': !!client.billing,
    'Has Controls': !!client.controls,
    'Has Settings': !!settings,
    'Outbound NOT Paused': client.controls ? !client.controls.outboundPaused : false,
  };

  Object.entries(checks).forEach(([check, pass]) => {
    console.log(`  ${pass ? '✅' : '❌'} ${check}`);
  });

  const allPass = Object.values(checks).every(v => v);
  console.log();
  console.log(allPass ? '✅ CLIENT READY FOR OPERATIONAL TEST' : '❌ CLIENT INCOMPLETE');

  await prisma.$disconnect();
  process.exit(allPass ? 0 : 1);
}

verifyClient().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
