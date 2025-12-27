-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PHASE 5: ADMIN CONTROL & OPERATOR HYGIENE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- This migration implements Phase 5 requirements:
-- 1. Alert acknowledgment system (append-only AlertLog)
-- 2. ClientControls table for operational gates
-- 3. ClientBilling table for billing state
-- 4. AdminAction audit trail
-- 5. Move alert fields from Client to ClientControls
--
-- SAFETY GUARANTEES:
-- - Additive operations only (no data loss)
-- - Idempotent (can be re-run safely)
-- - Default values for all new fields
-- - Indexes created CONCURRENTLY where possible
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 1: UPDATE BILLING ENUMS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Drop old BillingStatus enum if it exists (from align_schema migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingStatus') THEN
    -- Check if enum is in use
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE udt_name = 'BillingStatus'
    ) THEN
      DROP TYPE "BillingStatus";
      RAISE NOTICE 'Dropped old BillingStatus enum';
    ELSE
      RAISE NOTICE 'BillingStatus enum in use, will need manual migration';
    END IF;
  END IF;
END $$;

-- Create new BillingStatus enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingStatus') THEN
    CREATE TYPE "BillingStatus" AS ENUM (
      'TRIAL_PENDING',
      'TRIAL_ACTIVE',
      'TRIAL_EXPIRED',
      'ACTIVE',
      'DELINQUENT',
      'CANCELED',
      'SUSPENDED'
    );
    RAISE NOTICE 'Created BillingStatus enum';
  ELSE
    RAISE NOTICE 'BillingStatus enum already exists';
  END IF;
END $$;

-- Create PaymentSource enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentSource') THEN
    CREATE TYPE "PaymentSource" AS ENUM (
      'NONE',
      'STRIPE',
      'MANUAL',
      'WAIVED'
    );
    RAISE NOTICE 'Created PaymentSource enum';
  ELSE
    RAISE NOTICE 'PaymentSource enum already exists';
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 2: CREATE CLIENT_BILLING TABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'client_billing'
  ) THEN
    CREATE TABLE "client_billing" (
      "id" TEXT NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL,
      "client_id" TEXT NOT NULL,
      "status" "BillingStatus" NOT NULL DEFAULT 'TRIAL_PENDING',
      "payment_source" "PaymentSource" NOT NULL DEFAULT 'NONE',
      "trial_used_at" TIMESTAMP(3),
      "trial_started_at" TIMESTAMP(3),
      "trial_ends_at" TIMESTAMP(3),
      "subscription_started_at" TIMESTAMP(3),
      "subscription_ends_at" TIMESTAMP(3),
      "stripe_customer_id" TEXT,
      "stripe_subscription_id" TEXT,
      "last_billing_event_at" TIMESTAMP(3),
      "last_billing_event_type" TEXT,

      CONSTRAINT "client_billing_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "client_billing_client_id_key" UNIQUE ("client_id"),
      CONSTRAINT "client_billing_client_id_fkey" FOREIGN KEY ("client_id")
        REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    -- Indexes
    CREATE INDEX "client_billing_status_idx" ON "client_billing"("status");
    CREATE INDEX "client_billing_payment_source_idx" ON "client_billing"("payment_source");

    RAISE NOTICE 'Created client_billing table';
  ELSE
    RAISE NOTICE 'Table client_billing already exists';
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 3: CREATE CLIENT_CONTROLS TABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'client_controls'
  ) THEN
    CREATE TABLE "client_controls" (
      "id" TEXT NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL,
      "client_id" TEXT NOT NULL,

      -- Kill switches
      "outbound_paused" BOOLEAN NOT NULL DEFAULT false,
      "outbound_paused_at" TIMESTAMP(3),
      "outbound_paused_reason" TEXT,
      "ai_disabled" BOOLEAN NOT NULL DEFAULT false,
      "ai_disabled_at" TIMESTAMP(3),
      "ai_disabled_reason" TEXT,

      -- Ops alerting control (Phase 5: Moved from Client)
      "ops_alerts_muted" BOOLEAN NOT NULL DEFAULT false,
      "payment_gate_alerted_at" TIMESTAMP(3),
      "payment_gate_alert_count" INTEGER NOT NULL DEFAULT 0,

      CONSTRAINT "client_controls_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "client_controls_client_id_key" UNIQUE ("client_id"),
      CONSTRAINT "client_controls_client_id_fkey" FOREIGN KEY ("client_id")
        REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    RAISE NOTICE 'Created client_controls table';
  ELSE
    RAISE NOTICE 'Table client_controls already exists';
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 4: MIGRATE ALERT FIELDS FROM CLIENTS TO CLIENT_CONTROLS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
DECLARE
  rows_migrated INTEGER := 0;
BEGIN
  -- Check if alert fields exist on clients table
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'opsAlertsMuted'
  ) THEN
    -- Migrate data from clients to client_controls
    INSERT INTO "client_controls" (
      "id",
      "client_id",
      "ops_alerts_muted",
      "payment_gate_alerted_at",
      "payment_gate_alert_count",
      "created_at",
      "updated_at"
    )
    SELECT
      gen_random_uuid(),
      c."id",
      COALESCE(c."opsAlertsMuted", false),
      c."paymentGateAlertedAt",
      COALESCE(c."paymentGateAlertCount", 0),
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    FROM "clients" c
    WHERE NOT EXISTS (
      SELECT 1 FROM "client_controls" cc WHERE cc."client_id" = c."id"
    );

    GET DIAGNOSTICS rows_migrated = ROW_COUNT;
    RAISE NOTICE 'Migrated alert fields for % clients', rows_migrated;

    -- Drop alert fields from clients table (cleanup)
    -- NOTE: Commented out for safety - can be run manually after verification
    -- ALTER TABLE "clients" DROP COLUMN IF EXISTS "opsAlertsMuted";
    -- ALTER TABLE "clients" DROP COLUMN IF EXISTS "paymentGateAlertedAt";
    -- ALTER TABLE "clients" DROP COLUMN IF EXISTS "paymentGateAlertCount";
  ELSE
    RAISE NOTICE 'Alert fields not found on clients table (already migrated or never existed)';
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 5: UPDATE ALERT_LOGS FOR APPEND-ONLY PATTERN
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Drop UNIQUE constraint on (alert_type, alert_key)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'alert_logs'
      AND constraint_name = 'alert_logs_alert_type_alert_key_key'
  ) THEN
    ALTER TABLE "alert_logs" DROP CONSTRAINT "alert_logs_alert_type_alert_key_key";
    RAISE NOTICE 'Dropped UNIQUE constraint on alert_logs(alert_type, alert_key)';
  ELSE
    RAISE NOTICE 'UNIQUE constraint already removed from alert_logs';
  END IF;
END $$;

-- Add acknowledgment fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alert_logs' AND column_name = 'acknowledged_at'
  ) THEN
    ALTER TABLE "alert_logs" ADD COLUMN "acknowledged_at" TIMESTAMP(3);
    ALTER TABLE "alert_logs" ADD COLUMN "acknowledged_by" TEXT;
    ALTER TABLE "alert_logs" ADD COLUMN "resolution" TEXT;

    RAISE NOTICE 'Added acknowledgment fields to alert_logs';
  ELSE
    RAISE NOTICE 'Acknowledgment fields already exist on alert_logs';
  END IF;
END $$;

-- Add index on alert_key for queries (now that unique constraint is gone)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "alert_logs_alert_key_idx" ON "alert_logs"("alert_key");

-- Add index on acknowledged_at for filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS "alert_logs_acknowledged_at_idx" ON "alert_logs"("acknowledged_at");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 6: CREATE ADMIN_ACTIONS TABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_actions'
  ) THEN
    CREATE TABLE "admin_actions" (
      "id" TEXT NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "admin_id" TEXT NOT NULL,
      "client_id" TEXT,
      "action" TEXT NOT NULL,
      "reason" TEXT,
      "metadata" JSONB,

      CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
    );

    -- Indexes for admin action queries
    CREATE INDEX "admin_actions_client_id_idx" ON "admin_actions"("client_id");
    CREATE INDEX "admin_actions_admin_id_idx" ON "admin_actions"("admin_id");
    CREATE INDEX "admin_actions_created_at_idx" ON "admin_actions"("created_at");
    CREATE INDEX "admin_actions_action_idx" ON "admin_actions"("action");

    RAISE NOTICE 'Created admin_actions table';
  ELSE
    RAISE NOTICE 'Table admin_actions already exists';
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 7: CREATE BILLING_EVENTS TABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_events'
  ) THEN
    CREATE TABLE "billing_events" (
      "id" TEXT NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "client_id" TEXT NOT NULL,
      "stripe_event_id" TEXT NOT NULL,
      "event_type" TEXT NOT NULL,
      "event_data" JSONB,
      "processed_at" TIMESTAMP(3) NOT NULL,
      "processing_time_ms" INTEGER,

      CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "billing_events_stripe_event_id_key" UNIQUE ("stripe_event_id")
    );

    -- Indexes
    CREATE INDEX "billing_events_client_id_idx" ON "billing_events"("client_id");
    CREATE INDEX "billing_events_event_type_idx" ON "billing_events"("event_type");
    CREATE INDEX "billing_events_processed_at_idx" ON "billing_events"("processed_at");

    RAISE NOTICE 'Created billing_events table';
  ELSE
    RAISE NOTICE 'Table billing_events already exists';
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRATION COMPLETE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Phase 5 schema is now complete:
-- ✅ AlertLog is append-only with acknowledgment support
-- ✅ ClientControls table created with migrated alert fields
-- ✅ ClientBilling table created with billing state machine
-- ✅ AdminAction table created for audit trail
-- ✅ BillingEvents table created for Stripe idempotency
--
-- NEXT STEPS:
-- 1. Verify Prisma client generation: npx prisma generate
-- 2. Test backend boot: npm run dev
-- 3. Verify all Phase 5 services compile correctly
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
