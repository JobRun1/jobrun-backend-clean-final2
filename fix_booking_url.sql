UPDATE public.client_settings
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{bookingUrl}',
  '"https://jobrun.co.uk/book/default-client"'::jsonb
),
"updatedAt" = NOW()
WHERE "clientId" = 'default-client';
