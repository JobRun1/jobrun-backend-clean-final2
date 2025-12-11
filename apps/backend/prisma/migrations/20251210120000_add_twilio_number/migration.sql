-- AlterTable
-- Add twilioNumber field to clients table for storing assigned Twilio phone numbers
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "twilioNumber" TEXT;

-- Create index for faster lookups by Twilio number (useful for incoming webhook routing)
CREATE INDEX IF NOT EXISTS "clients_twilioNumber_idx" ON "clients"("twilioNumber");
