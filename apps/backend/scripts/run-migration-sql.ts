/**
 * MANUAL MIGRATION RUNNER
 *
 * Executes the migration SQL directly against the database.
 * Use this when migrate deploy fails.
 */

import { prisma } from '../src/db';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  const migrationPath = path.join(__dirname, '../prisma/migrations/20241224_add_alert_log_and_twilio_pool/migration.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 RUNNING MIGRATION SQL DIRECTLY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Migration: 20241224_add_alert_log_and_twilio_pool');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    await prisma.$executeRawUnsafe(sql);
    console.log('✅ Migration executed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
