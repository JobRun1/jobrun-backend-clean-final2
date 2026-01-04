-- Check existing clients
SELECT id, business_name, phone_number, twilio_number, region
FROM clients
ORDER BY created_at DESC
LIMIT 5;

-- Check TwilioNumberPool
SELECT phone_e164, role, status, client_id
FROM twilio_number_pool
ORDER BY created_at DESC
LIMIT 10;

-- Check ClientSettings
SELECT client_id, business_name, phone_number
FROM client_settings
LIMIT 5;
