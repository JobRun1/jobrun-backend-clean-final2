-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BOOTSTRAP: Default Client (Production-Safe, Idempotent)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Runs automatically on: prisma migrate deploy
-- Safe to re-run: Uses ON CONFLICT DO UPDATE
-- Region: UK
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Create default client
INSERT INTO clients (
  id,
  "createdAt",
  "updatedAt",
  "businessName",
  region,
  timezone,
  "phoneNumber",
  "twilioNumber",
  "demoToolsVisible",
  "demoClient",
  "businessHours"
)
VALUES (
  'default-client',
  NOW(),
  NOW(),
  'JobRun UK',
  'UK',
  'Europe/London',
  '+447700900000',
  '+447700900000',
  false,
  false,
  jsonb_build_object(
    'monday', jsonb_build_object('open', '09:00', 'close', '17:00'),
    'tuesday', jsonb_build_object('open', '09:00', 'close', '17:00'),
    'wednesday', jsonb_build_object('open', '09:00', 'close', '17:00'),
    'thursday', jsonb_build_object('open', '09:00', 'close', '17:00'),
    'friday', jsonb_build_object('open', '09:00', 'close', '17:00'),
    'saturday', jsonb_build_object('closed', true),
    'sunday', jsonb_build_object('closed', true)
  )
)
ON CONFLICT (id) DO UPDATE SET
  "updatedAt" = EXCLUDED."updatedAt",
  "businessName" = EXCLUDED."businessName",
  region = EXCLUDED.region,
  timezone = EXCLUDED.timezone;

-- 2. Create/update default client settings (idempotent, self-healing)
INSERT INTO client_settings (
  id,
  "createdAt",
  "updatedAt",
  "clientId",
  "businessName",
  services,
  availability,
  pricing,
  "phoneNumber",
  email,
  website,
  "serviceArea",
  metadata
)
VALUES (
  gen_random_uuid(),
  NOW(),
  NOW(),
  'default-client',
  'JobRun UK',
  'Home Services, Repairs, Maintenance',
  'Monday-Friday 9am-5pm',
  'Service call: £75, Hourly rate: £95',
  '+447700900000',
  'contact@jobrun.uk',
  'https://jobrun.uk',
  'Greater London',
  jsonb_build_object(
    'bookingUrl', 'https://calendly.com/jobrun-uk',
    'urgent_alert_number', '+447700900000',
    'booking_link_enabled', true,
    'onboarding_complete', true,
    'system_version', 'v1.0.0',
    'ai_pipeline_enabled', true
  )
)
ON CONFLICT ("clientId") DO UPDATE SET
  "updatedAt" = EXCLUDED."updatedAt",
  "businessName" = EXCLUDED."businessName",
  services = EXCLUDED.services,
  availability = EXCLUDED.availability,
  pricing = EXCLUDED.pricing,
  "phoneNumber" = EXCLUDED."phoneNumber",
  email = EXCLUDED.email,
  website = EXCLUDED.website,
  "serviceArea" = EXCLUDED."serviceArea",
  metadata = EXCLUDED.metadata;

-- 3. Prevent deletion of default client
CREATE OR REPLACE FUNCTION prevent_bootstrap_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.id = 'default-client' THEN
    RAISE EXCEPTION 'Cannot delete bootstrap client (required for JobRun startup)';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (idempotent)
DROP TRIGGER IF EXISTS protect_bootstrap_client ON clients;

-- Create trigger
CREATE TRIGGER protect_bootstrap_client
BEFORE DELETE ON clients
FOR EACH ROW EXECUTE FUNCTION prevent_bootstrap_deletion();

-- 4. Verify bootstrap succeeded
DO $$
DECLARE
  client_exists BOOLEAN;
  settings_exists BOOLEAN;
  booking_url_valid BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM clients WHERE id = 'default-client'
  ) INTO client_exists;

  SELECT EXISTS(
    SELECT 1 FROM client_settings WHERE "clientId" = 'default-client'
  ) INTO settings_exists;

  SELECT EXISTS(
    SELECT 1
    FROM client_settings
    WHERE "clientId" = 'default-client'
      AND metadata->>'bookingUrl' IS NOT NULL
      AND metadata->>'bookingUrl' LIKE 'http%'
  ) INTO booking_url_valid;

  IF NOT (client_exists AND settings_exists AND booking_url_valid) THEN
    RAISE EXCEPTION 'Bootstrap verification failed: client=%, settings=%, bookingUrl=%',
      client_exists, settings_exists, booking_url_valid;
  END IF;

  RAISE NOTICE '✅ Bootstrap default client created and verified';
END $$;
