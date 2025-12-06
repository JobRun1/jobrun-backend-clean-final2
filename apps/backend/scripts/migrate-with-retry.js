#!/usr/bin/env node
/**
 * Graceful Migration Script with Retry Logic
 *
 * This script runs Prisma migrations with proper error handling.
 * Instead of crashing the deployment, it logs errors and allows
 * the app to start so you can manually fix migrations.
 *
 * Usage: node scripts/migrate-with-retry.js
 */

const { execSync } = require('child_process');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runMigrations() {
  console.log('🔄 Starting database migration...\n');

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`📋 Attempt ${attempt}/${MAX_RETRIES}: Running prisma migrate deploy...`);

      // Run migration with output
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: process.env,
      });

      console.log('\n✅ Migrations completed successfully!');
      return true;

    } catch (error) {
      console.error(`\n❌ Migration attempt ${attempt} failed:`, error.message);

      if (attempt < MAX_RETRIES) {
        console.log(`⏳ Retrying in ${RETRY_DELAY_MS / 1000} seconds...\n`);
        await sleep(RETRY_DELAY_MS);
      } else {
        console.error('\n⚠️  All migration attempts failed!');
        console.error('\n📝 Common issues:');
        console.error('   1. Failed migration in _prisma_migrations table');
        console.error('   2. Database connection issues');
        console.error('   3. Duplicate data violating constraints');
        console.error('\n🔧 To fix:');
        console.error('   1. Connect to Railway Postgres');
        console.error('   2. Run: node scripts/rollback-migration.js');
        console.error('   3. Redeploy the service\n');

        // Don't crash - allow app to start for manual debugging
        console.log('⚠️  Continuing startup despite migration failure...');
        console.log('🔧 Manual intervention required to fix migrations\n');

        return false;
      }
    }
  }
}

// Execute
runMigrations()
  .then((success) => {
    if (success) {
      process.exit(0);
    } else {
      // Exit with 0 to allow app to start
      // Change to process.exit(1) if you want to prevent startup on migration failure
      console.log('⚠️  Exiting with success code to allow app startup...');
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
