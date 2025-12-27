/**
 * TWILIO NUMBER POOL SEED SCRIPT
 *
 * Seeds the twilio_number_pool table with available numbers.
 * Reads from TWILIO_POOL_NUMBERS environment variable.
 *
 * Usage:
 *   TWILIO_POOL_NUMBERS="+447123456789,+447987654321,..." npx ts-node scripts/seed-twilio-pool.ts
 *
 * Safety:
 *   - Skips numbers that already exist in pool
 *   - Idempotent (can be run multiple times)
 *   - Validates E.164 format
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function validateE164(phoneNumber: string): boolean {
  // E.164 format: +[country code][number]
  // Example: +447476955179
  const e164Regex = /^\+\d{10,15}$/;
  return e164Regex.test(phoneNumber);
}

async function seedTwilioPool() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📞 TWILIO NUMBER POOL SEED SCRIPT");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 1. Read env var or use default test numbers
  const poolNumbers = process.env.TWILIO_POOL_NUMBERS ||
    "+447700900001,+447700900002,+447700900003,+447700900004,+447700900005,+447700900006,+447700900007,+447700900008,+447700900009,+447700900010";

  if (!process.env.TWILIO_POOL_NUMBERS) {
    console.log("ℹ️  TWILIO_POOL_NUMBERS not set, using default test numbers");
  }

  // 2. Parse comma-separated list
  const numbers = poolNumbers
    .split(",")
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  if (numbers.length === 0) {
    console.error("❌ No valid numbers found in TWILIO_POOL_NUMBERS");
    process.exit(1);
  }

  console.log(`📋 Found ${numbers.length} numbers to seed`);

  // 3. Validate all numbers
  const invalidNumbers: string[] = [];
  const validNumbers: string[] = [];

  for (const number of numbers) {
    if (validateE164(number)) {
      validNumbers.push(number);
    } else {
      invalidNumbers.push(number);
    }
  }

  if (invalidNumbers.length > 0) {
    console.error("❌ Invalid E.164 format numbers detected:");
    invalidNumbers.forEach((n) => console.error(`   - ${n}`));
    console.error("   E.164 format: +[country code][number] (e.g., +447476955179)");
    process.exit(1);
  }

  console.log(`✅ All ${validNumbers.length} numbers are valid E.164 format`);

  // 4. Check existing numbers
  const existing = await prisma.twilioNumberPool.findMany({
    where: {
      phoneE164: {
        in: validNumbers,
      },
    },
    select: {
      phoneE164: true,
      status: true,
    },
  });

  const existingSet = new Set(existing.map((e) => e.phoneE164));
  const toInsert = validNumbers.filter((n) => !existingSet.has(n));

  if (existing.length > 0) {
    console.log(`⚠️  ${existing.length} numbers already exist in pool:`);
    existing.forEach((e) => console.log(`   - ${e.phoneE164} (${e.status})`));
  }

  if (toInsert.length === 0) {
    console.log("✅ All numbers already in pool, nothing to insert");
    await prisma.$disconnect();
    return;
  }

  console.log(`📝 Inserting ${toInsert.length} new numbers...`);

  // 5. Insert new numbers as AVAILABLE
  let inserted = 0;
  let failed = 0;

  for (const phoneE164 of toInsert) {
    try {
      await prisma.twilioNumberPool.create({
        data: {
          phoneE164,
          status: "AVAILABLE",
          clientId: null,
          assignedAt: null,
        },
      });

      console.log(`✅ Inserted: ${phoneE164}`);
      inserted++;
    } catch (error) {
      console.error(`❌ Failed to insert ${phoneE164}:`, error);
      failed++;
    }
  }

  // 6. Summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 SEED SUMMARY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Total numbers requested: ${validNumbers.length}`);
  console.log(`Already in pool: ${existing.length}`);
  console.log(`Newly inserted: ${inserted}`);
  console.log(`Failed: ${failed}`);

  // 7. Show current pool state
  const poolState = await prisma.twilioNumberPool.groupBy({
    by: ["status"],
    _count: true,
  });

  console.log("\n📊 CURRENT POOL STATE:");
  poolState.forEach((state) => {
    console.log(`   ${state.status}: ${state._count} numbers`);
  });

  await prisma.$disconnect();
  console.log("\n✅ Seed script completed");
}

seedTwilioPool()
  .catch((error) => {
    console.error("❌ Seed script failed:", error);
    process.exit(1);
  });
