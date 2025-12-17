-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BOOTSTRAP VERIFICATION SCRIPT
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Run this after migration to verify bootstrap worked
-- Usage: psql $DATABASE_URL -f verify-bootstrap.sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'BOOTSTRAP VERIFICATION'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- 1. Check client exists
\echo '1. Checking default client...'
SELECT
  CASE
    WHEN COUNT(*) = 1 THEN '✅ Client exists'
    ELSE '❌ Client missing'
  END AS status,
  id,
  "businessName",
  region,
  timezone
FROM clients
WHERE id = 'default-client'
GROUP BY id, "businessName", region, timezone;

\echo ''

-- 2. Check client settings exists
\echo '2. Checking client settings...'
SELECT
  CASE
    WHEN COUNT(*) = 1 THEN '✅ Settings exist'
    ELSE '❌ Settings missing'
  END AS status,
  "clientId",
  "businessName",
  email
FROM client_settings
WHERE "clientId" = 'default-client'
GROUP BY "clientId", "businessName", email;

\echo ''

-- 3. Check metadata.bookingUrl
\echo '3. Checking metadata.bookingUrl...'
SELECT
  CASE
    WHEN metadata->>'bookingUrl' IS NOT NULL AND metadata->>'bookingUrl' LIKE 'http%'
    THEN '✅ Booking URL valid'
    ELSE '❌ Booking URL invalid or missing'
  END AS status,
  metadata->>'bookingUrl' AS booking_url,
  metadata->>'urgent_alert_number' AS alert_number,
  metadata->>'ai_pipeline_enabled' AS ai_enabled
FROM client_settings
WHERE "clientId" = 'default-client';

\echo ''

-- 4. Check deletion protection
\echo '4. Checking deletion protection...'
SELECT
  CASE
    WHEN COUNT(*) = 1 THEN '✅ Trigger exists'
    ELSE '❌ Trigger missing'
  END AS status,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'protect_bootstrap_client'
GROUP BY trigger_name, event_manipulation, action_statement;

\echo ''

-- 5. Test deletion protection (safe - will rollback)
\echo '5. Testing deletion protection (will rollback)...'
BEGIN;
  DELETE FROM clients WHERE id = 'default-client';
ROLLBACK;
-- If you see an error above, the trigger is working correctly

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'VERIFICATION COMPLETE'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo 'Expected results:'
\echo '  ✅ Client exists (UK, Europe/London)'
\echo '  ✅ Settings exist (email, phone, metadata)'
\echo '  ✅ Booking URL valid (starts with http)'
\echo '  ✅ Trigger exists (protect_bootstrap_client)'
\echo '  ERROR in test 5 = SUCCESS (deletion blocked)'
\echo ''
\echo 'If all checks pass, bootstrap is ready for production.'
\echo ''
