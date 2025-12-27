const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: 'cmjj6xyxm0006kih7xpsoe80m' },
      include: {
        _count: {
          select: {
            messages: true,
            customers: true,
            bookings: true,
            conversations: true,
            leads: true,
            users: true
          }
        }
      }
    });

    if (!client) {
      console.log('❌ CLIENT NOT FOUND');
      return;
    }

    // Fetch onboarding state separately (one-to-one relationship)
    const onboardingState = await prisma.onboardingState.findUnique({
      where: { clientId: client.id }
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('CLIENT FOUND:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Business Name:', client.businessName);
    console.log('Client ID:', client.id);
    console.log('Onboarding Complete:', client.onboardingComplete);
    console.log('Payment Active:', client.paymentActive);
    console.log('Ops Alerts Muted:', client.opsAlertsMuted);
    console.log('Payment Gate Alerted At:', client.paymentGateAlertedAt || '(never)');
    console.log('Twilio Number:', client.twilioNumber || '(none)');
    console.log('');
    console.log('ONBOARDING STATE:');
    if (onboardingState) {
      console.log('Current Stage:', onboardingState.currentStage);
      console.log('Stuck Detected At:', onboardingState.stuckDetectedAt || '(not stuck)');
    } else {
      console.log('(no onboarding state found)');
    }
    console.log('');
    console.log('DEPENDENT RECORDS:');
    console.log('Messages:', client._count.messages);
    console.log('Customers:', client._count.customers);
    console.log('Bookings:', client._count.bookings);
    console.log('Conversations:', client._count.conversations);
    console.log('Leads:', client._count.leads);
    console.log('Users:', client._count.users);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('SAFETY CHECK STATUS:');
    console.log('✓ onboardingComplete = false:', !client.onboardingComplete);
    console.log('✓ paymentActive = false:', !client.paymentActive);
    console.log('✓ opsAlertsMuted = true:', client.opsAlertsMuted);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
