-- Migration: Add role-based routing to TwilioNumberPool
-- Purpose: Prevent onboarding logic from being triggered by voice calls
-- Date: 2026-01-03

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 1: Create TwilioNumberRole enum
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TYPE "TwilioNumberRole" AS ENUM (
  'OPERATIONAL',  -- Client's dedicated number for customer job intake
  'ONBOARDING',   -- System onboarding number (SMS-only, voice FORBIDDEN)
  'SYSTEM'        -- Test/forwarded/internal numbers
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 2: Add role column to twilio_number_pool
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE "twilio_number_pool"
ADD COLUMN "role" "TwilioNumberRole" NOT NULL DEFAULT 'OPERATIONAL';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 3: Create index for role-based queries
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE INDEX "twilio_number_pool_role_idx" ON "twilio_number_pool"("role");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 4: Mark known onboarding number (CRITICAL)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Hardcoded onboarding number from code (line 50 in twilio.ts)
UPDATE "twilio_number_pool"
SET "role" = 'ONBOARDING'
WHERE "phone_e164" = '447476955179';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 5: Verification queries
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Check role distribution
SELECT
  role,
  COUNT(*) as count,
  ARRAY_AGG(phone_e164 ORDER BY phone_e164) as numbers
FROM "twilio_number_pool"
GROUP BY role
ORDER BY role;

-- Verify onboarding number is marked correctly
SELECT phone_e164, role, status, client_id
FROM "twilio_number_pool"
WHERE phone_e164 = '447476955179';

-- Check for any unassigned OPERATIONAL numbers (data consistency)
SELECT phone_e164, role, status, client_id
FROM "twilio_number_pool"
WHERE role = 'OPERATIONAL'
  AND client_id IS NULL
  AND status = 'AVAILABLE';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- OPTIONAL: Mark test/system numbers
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Example: Mark known test numbers as SYSTEM
-- UPDATE "twilio_number_pool"
-- SET "role" = 'SYSTEM'
-- WHERE "phone_e164" IN (
--   '447700900000',  -- Example test number
--   '447700900001'   -- Example test number
-- );

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ROLLBACK (if needed)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- DROP INDEX "twilio_number_pool_role_idx";
-- ALTER TABLE "twilio_number_pool" DROP COLUMN "role";
-- DROP TYPE "TwilioNumberRole";
