import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyFix() {
  console.log('🔧 Applying self-healing fix to client_settings...\n');

  try {
    // Execute the fixed UPSERT directly
    await prisma.$executeRaw`
      INSERT INTO client_settings (
        id,
        "createdAt",
        "updatedAt",
        "clientId",
        "businessName",
        services,
        availability,
        pricing,
        "phoneNumber",
        email,
        website,
        "serviceArea",
        metadata
      )
      VALUES (
        gen_random_uuid(),
        NOW(),
        NOW(),
        'default-client',
        'JobRun UK',
        'Home Services, Repairs, Maintenance',
        'Monday-Friday 9am-5pm',
        'Service call: £75, Hourly rate: £95',
        '+447700900000',
        'contact@jobrun.uk',
        'https://jobrun.uk',
        'Greater London',
        jsonb_build_object(
          'bookingUrl', 'https://calendly.com/jobrun-uk',
          'urgent_alert_number', '+447700900000',
          'booking_link_enabled', true,
          'onboarding_complete', true,
          'system_version', 'v1.0.0',
          'ai_pipeline_enabled', true
        )
      )
      ON CONFLICT ("clientId") DO UPDATE SET
        "updatedAt" = EXCLUDED."updatedAt",
        "businessName" = EXCLUDED."businessName",
        services = EXCLUDED.services,
        availability = EXCLUDED.availability,
        pricing = EXCLUDED.pricing,
        "phoneNumber" = EXCLUDED."phoneNumber",
        email = EXCLUDED.email,
        website = EXCLUDED.website,
        "serviceArea" = EXCLUDED."serviceArea",
        metadata = EXCLUDED.metadata;
    `;

    console.log('✅ Self-healing fix applied successfully');

    // Verify the fix
    const settings = await prisma.clientSettings.findUnique({
      where: { clientId: 'default-client' }
    });

    const metadata = settings?.metadata as any;

    console.log('\n📊 Verification:');
    console.log(`   Business: ${settings?.businessName}`);
    console.log(`   Email: ${settings?.email}`);
    console.log(`   Phone: ${settings?.phoneNumber}`);
    console.log(`   Booking URL: ${metadata?.bookingUrl}`);
    console.log(`   Alert Number: ${metadata?.urgent_alert_number}`);
    console.log(`   AI Pipeline: ${metadata?.ai_pipeline_enabled}`);

    if (
      settings?.businessName === 'JobRun UK' &&
      settings?.email === 'contact@jobrun.uk' &&
      metadata?.bookingUrl === 'https://calendly.com/jobrun-uk' &&
      metadata?.urgent_alert_number === '+447700900000' &&
      metadata?.ai_pipeline_enabled === true
    ) {
      console.log('\n✅ All fields verified correct');
    } else {
      console.log('\n❌ Some fields still incorrect');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyFix();
