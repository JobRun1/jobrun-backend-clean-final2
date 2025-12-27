const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Query the client directly from DB
    const client = await prisma.$queryRaw`
      SELECT
        id,
        "businessName",
        "paymentActive",
        "opsAlertsMuted",
        "twilioNumber",
        "paymentGateAlertedAt"
      FROM clients
      WHERE id = 'cmjj6xyxm0006kih7xpsoe80m';
    `;

    if (!client || client.length === 0) {
      console.log('❌ CLIENT NOT FOUND');
      return;
    }

    const c = client[0];

    // Get onboarding state
    const onboarding = await prisma.$queryRaw`
      SELECT
        "current_state" as "currentState",
        "completed_at" as "completedAt",
        "stuck_detected_at" as "stuckDetectedAt"
      FROM onboarding_states
      WHERE client_id = 'cmjj6xyxm0006kih7xpsoe80m';
    `;

    const ob = onboarding && onboarding.length > 0 ? onboarding[0] : null;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('CLIENT STATE FOR DELETION:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Business Name:', c.businessName);
    console.log('Client ID:', c.id);
    console.log('');
    console.log('DELETION SAFETY CHECKS:');
    console.log('paymentActive:', c.paymentActive);
    console.log('opsAlertsMuted:', c.opsAlertsMuted);
    console.log('Onboarding Complete:', ob ? (ob.completedAt ? 'YES (completed)' : 'NO (not completed)') : 'NO (no state)');
    console.log('');
    console.log('ONBOARDING INFO:');
    if (ob) {
      console.log('Current State:', ob.currentState);
      console.log('Completed At:', ob.completedAt || '(not completed)');
      console.log('Stuck Detected At:', ob.stuckDetectedAt || '(not stuck)');
    } else {
      console.log('(no onboarding state found)');
    }
    console.log('');
    console.log('OTHER INFO:');
    console.log('Twilio Number:', c.twilioNumber || '(none)');
    console.log('Payment Gate Alerted At:', c.paymentGateAlertedAt || '(never)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('DELETION REQUIREMENTS:');
    console.log('✓ paymentActive = false:', !c.paymentActive);
    console.log('✓ opsAlertsMuted = true:', c.opsAlertsMuted);
    console.log('✓ onboarding NOT complete:', ob ? !ob.completedAt : true);
    console.log('');
    const canDelete = !c.paymentActive && c.opsAlertsMuted && (ob ? !ob.completedAt : true);
    console.log(canDelete ? '✅ CLIENT CAN BE DELETED' : '❌ SAFETY CHECKS FAILED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
