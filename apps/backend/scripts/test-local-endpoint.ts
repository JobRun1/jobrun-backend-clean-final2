/**
 * LOCAL ENDPOINT TEST
 *
 * Simulates a Twilio voice callback to verify routing logic
 */

import express from 'express';

// Start server and make request
async function testLocal() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('LOCAL ENDPOINT TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('To test locally:');
  console.log('1. Start backend: npm run dev');
  console.log('2. In another terminal, run:');
  console.log();
  console.log('curl -X POST http://localhost:3000/api/twilio/voice \\');
  console.log('  -H "Content-Type: application/x-www-form-urlencoded" \\');
  console.log('  -d "From=%2B447542769817" \\');
  console.log('  -d "To=%2B447414148956" \\');
  console.log('  -d "CallStatus=ringing"');
  console.log();
  console.log('3. Check logs for:');
  console.log('   - "🚨 HIT NEW CODE — JOBRUN VOICE"');
  console.log('   - "Number role resolved for voice call"');
  console.log('   - Role: OPERATIONAL');
  console.log('   - "✅ Voice call guard passed"');
  console.log();
  console.log('4. Then test status callback:');
  console.log();
  console.log('curl -X POST http://localhost:3000/api/twilio/status \\');
  console.log('  -H "Content-Type: application/x-www-form-urlencoded" \\');
  console.log('  -d "From=%2B447542769817" \\');
  console.log('  -d "To=%2B447414148956" \\');
  console.log('  -d "CallStatus=no-answer" \\');
  console.log('  -d "CallDuration=0"');
  console.log();
  console.log('5. Expected output:');
  console.log('   - "🚨 HIT NEW CODE — JOBRUN STATUS"');
  console.log('   - "Number role resolved for status callback"');
  console.log('   - "🔀 ROUTING DECISION: OPERATIONAL (CUSTOMER FLOW)"');
  console.log('   - "✅ [OPERATIONAL] Customer missed call SMS sent"');
}

testLocal();
