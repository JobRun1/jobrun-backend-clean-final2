SELECT
  "clientId",
  metadata->>'bookingUrl' AS current_booking_url,
  (metadata->>'bookingUrl') ~ '^https?://' AS is_absolute
FROM public.client_settings
WHERE "clientId" = 'default-client';
