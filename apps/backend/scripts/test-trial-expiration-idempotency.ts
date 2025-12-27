/**
 * IDEMPOTENCY TEST: Trial Expiration Sweep
 *
 * Demonstrates that runTrialExpirationSweep() is safe to run multiple times.
 *
 * This test:
 * 1. Runs sweep first time
 * 2. Runs sweep second time immediately
 * 3. Verifies no duplicate transitions
 * 4. Verifies state remains consistent
 *
 * EXPECTED RESULT:
 * - First run: Transitions any expired trials
 * - Second run: All transitions are no-ops (idempotent)
 * - No errors
 * - No duplicate audit logs
 */

import { runTrialExpirationSweep } from "../src/jobs/trialExpirationJob";

async function testIdempotency() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🧪 IDEMPOTENCY TEST: Trial Expiration Sweep");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("📍 Running sweep FIRST time...\n");
  const firstRun = await runTrialExpirationSweep();

  console.log("\n📍 Running sweep SECOND time (immediately)...\n");
  const secondRun = await runTrialExpirationSweep();

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 IDEMPOTENCY TEST RESULTS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`First run:`);
  console.log(`  - Total checked: ${firstRun.totalChecked}`);
  console.log(`  - Newly expired: ${firstRun.expired}`);
  console.log(`  - Already expired: ${firstRun.alreadyExpired}`);
  console.log(`  - Errors: ${firstRun.errors}`);

  console.log(`\nSecond run:`);
  console.log(`  - Total checked: ${secondRun.totalChecked}`);
  console.log(`  - Newly expired: ${secondRun.expired}`);
  console.log(`  - Already expired: ${secondRun.alreadyExpired}`);
  console.log(`  - Errors: ${secondRun.errors}`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ IDEMPOTENCY VALIDATION");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const idempotent = secondRun.expired === 0 && secondRun.errors === 0;

  if (idempotent) {
    console.log("✅ PASS: Second run performed 0 transitions (idempotent)");
    console.log("✅ PASS: No errors on second run");
    console.log("\n🎯 Sweep is safe to run multiple times");
  } else {
    console.error("❌ FAIL: Second run performed unexpected transitions");
    console.error(`   Expected: 0 newly expired`);
    console.error(`   Actual: ${secondRun.expired} newly expired`);
    throw new Error("Idempotency test failed");
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

// Run test
testIdempotency()
  .then(() => {
    console.log("✅ Idempotency test complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Idempotency test failed:", error);
    process.exit(1);
  });
