-- AlterTable: Rename existing unnamed unique constraints to named constraints
-- This migration is idempotent and safe for production

-- Step 1: Rename Customer unique constraint
-- Drop the auto-generated constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customers_clientId_phone_key'
  ) THEN
    ALTER TABLE customers DROP CONSTRAINT customers_clientId_phone_key;
  END IF;
END $$;

-- Create the named constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clientId_phone' AND conrelid = 'customers'::regclass
  ) THEN
    ALTER TABLE customers ADD CONSTRAINT "clientId_phone" UNIQUE ("clientId", phone);
  END IF;
END $$;

-- Step 2: Rename Lead unique constraint
-- Drop the auto-generated constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leads_clientId_phone_key'
  ) THEN
    ALTER TABLE leads DROP CONSTRAINT leads_clientId_phone_key;
  END IF;
END $$;

-- Create the named constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clientId_phone' AND conrelid = 'leads'::regclass
  ) THEN
    ALTER TABLE leads ADD CONSTRAINT "clientId_phone" UNIQUE ("clientId", phone);
  END IF;
END $$;
