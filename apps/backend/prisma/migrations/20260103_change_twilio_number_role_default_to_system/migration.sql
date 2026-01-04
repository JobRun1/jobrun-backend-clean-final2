-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PRODUCTION HARDENING: Add Twilio Number Pool Role Column with Safe Default
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- CRITICAL SAFETY FIX:
-- Add role column to twilio_number_pool with DEFAULT 'SYSTEM'
--
-- RATIONALE:
-- - OPERATIONAL numbers MUST be explicitly assigned to a client
-- - Newly purchased/migrated/mis-seeded numbers should NEVER default to OPERATIONAL
-- - OPERATIONAL without clientId binding = silent customer-impacting failure
-- - SYSTEM is the safe default for unknown/unassigned numbers
--
-- SAFETY GUARANTEES:
-- - Safe default for all new rows (SYSTEM)
-- - Existing rows with client_id set are marked OPERATIONAL
-- - Existing rows without client_id are marked SYSTEM
-- - No downtime
-- - Idempotent (can be re-run safely)
--
-- DEPLOYED WITH:
-- - Runtime startup invariant check (detects orphaned OPERATIONAL numbers)
-- - Metric tracking for monitoring/alerting
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Step 1: Create TwilioNumberRole enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TwilioNumberRole') THEN
    CREATE TYPE "TwilioNumberRole" AS ENUM ('OPERATIONAL', 'ONBOARDING', 'SYSTEM');
    RAISE NOTICE 'Created enum: TwilioNumberRole';
  ELSE
    RAISE NOTICE 'Enum TwilioNumberRole already exists';
  END IF;
END $$;

-- Step 2: Add role column with SYSTEM default
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'twilio_number_pool' AND column_name = 'role'
  ) THEN
    ALTER TABLE "twilio_number_pool" ADD COLUMN "role" "TwilioNumberRole" NOT NULL DEFAULT 'SYSTEM';
    RAISE NOTICE 'Added column: twilio_number_pool.role with default SYSTEM';
  ELSE
    RAISE NOTICE 'Column twilio_number_pool.role already exists';
  END IF;
END $$;

-- Step 3: Backfill existing rows
-- Numbers with client_id assigned = OPERATIONAL (they're actively serving customers)
-- Numbers without client_id = SYSTEM (safe default, won't cause customer issues)
UPDATE "twilio_number_pool"
SET "role" = 'OPERATIONAL'
WHERE "client_id" IS NOT NULL AND "role" = 'SYSTEM';

-- Step 4: Add index for performance (role is queried frequently)
CREATE INDEX IF NOT EXISTS "twilio_number_pool_role_idx" ON "twilio_number_pool"("role");

-- Step 5: Add composite index for common query pattern (role + clientId)
CREATE INDEX IF NOT EXISTS "twilio_number_pool_role_client_id_idx" ON "twilio_number_pool"("role", "client_id");
