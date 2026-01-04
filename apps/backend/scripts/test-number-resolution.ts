import { resolveNumberRole, getNumberRoleDescription } from '../src/utils/numberRoleResolver';

async function testResolution() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('NUMBER ROLE RESOLUTION TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const testNumber = '447414148956'; // FastFix Twilio number

  console.log(`Testing: ${testNumber}`);
  console.log();

  const result = await resolveNumberRole(testNumber);

  console.log('RESOLUTION RESULT:');
  console.log(`  Phone: ${result.phoneE164}`);
  console.log(`  Role: ${result.role}`);
  console.log(`  Client ID: ${result.clientId || 'NONE'}`);
  console.log(`  Source: ${result.source}`);
  console.log(`  Is Known: ${result.isKnown}`);
  console.log(`  Description: ${getNumberRoleDescription(result.role)}`);
  console.log();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('EXPECTED BEHAVIOR:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (result.role === 'OPERATIONAL') {
    console.log('✅ CORRECT: Number will route to OPERATIONAL flow');
    console.log('   - Voice call → Generic TwiML');
    console.log('   - Status callback → Customer missed call SMS');
    console.log('   - NO onboarding triggered');
  } else if (result.role === 'SYSTEM') {
    console.log('⚠️  WARNING: Number will route to SYSTEM fail-safe flow');
    console.log('   - Customer will get generic intake SMS');
    console.log('   - NOT optimal but acceptable');
  } else if (result.role === 'ONBOARDING') {
    console.log('🚨 CRITICAL: Number will trigger onboarding (WRONG!)');
  }

  process.exit(0);
}

testResolution().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
