-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- OPS ALERTS: STATE-BASED ALERT SUPPRESSION
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Adds fields to track payment gate alert state to prevent repeated alerts.
--
-- PROBLEM SOLVED:
-- - Alerts were firing every ~6 hours for same unresolved payment block
-- - Time-based re-alerting caused alert spam
--
-- SOLUTION:
-- - State-based alerting: alert once when entering blocked state
-- - Track when alert was sent (paymentGateAlertedAt)
-- - Track historical alert count (paymentGateAlertCount)
-- - Allow manual muting for testing/demos (opsAlertsMuted)
--
-- SAFETY GUARANTEES:
-- - Additive only (no data loss)
-- - Safe defaults for all new fields
-- - No downtime
-- - Idempotent (can be re-run safely)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 1: ADD OPS ALERT FIELDS TO CLIENTS TABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Add paymentGateAlertedAt (tracks when last payment gate alert was sent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'paymentGateAlertedAt'
  ) THEN
    ALTER TABLE "clients" ADD COLUMN "paymentGateAlertedAt" TIMESTAMP(3);
    RAISE NOTICE 'Added column: clients.paymentGateAlertedAt';
  ELSE
    RAISE NOTICE 'Column clients.paymentGateAlertedAt already exists';
  END IF;
END $$;

-- Add paymentGateAlertCount (historical count, never reset)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'paymentGateAlertCount'
  ) THEN
    ALTER TABLE "clients" ADD COLUMN "paymentGateAlertCount" INTEGER NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added column: clients.paymentGateAlertCount';
  ELSE
    RAISE NOTICE 'Column clients.paymentGateAlertCount already exists';
  END IF;
END $$;

-- Add opsAlertsMuted (manual mute flag for testing/demos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'opsAlertsMuted'
  ) THEN
    ALTER TABLE "clients" ADD COLUMN "opsAlertsMuted" BOOLEAN NOT NULL DEFAULT FALSE;
    RAISE NOTICE 'Added column: clients.opsAlertsMuted';
  ELSE
    RAISE NOTICE 'Column clients.opsAlertsMuted already exists';
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 2: ADD STUCKDETECTEDAT TO ONBOARDING_STATES TABLE (BUG FIX)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- This field was referenced in StuckClientDetector but didn't exist in schema.
-- Adding it here to fix compilation errors.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'onboarding_states' AND column_name = 'stuck_detected_at'
  ) THEN
    ALTER TABLE "onboarding_states" ADD COLUMN "stuck_detected_at" TIMESTAMP(3);
    RAISE NOTICE 'Added column: onboarding_states.stuck_detected_at';
  ELSE
    RAISE NOTICE 'Column onboarding_states.stuck_detected_at already exists';
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRATION COMPLETE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- All operations are idempotent and can be re-run safely.
-- No indexes needed (these fields are not frequently queried).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
