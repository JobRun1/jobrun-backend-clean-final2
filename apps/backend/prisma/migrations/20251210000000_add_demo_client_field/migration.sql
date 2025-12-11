-- AlterTable
-- Add demoClient field to clients table
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "demoClient" BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster filtering of demo clients
CREATE INDEX IF NOT EXISTS "clients_demoClient_idx" ON "clients"("demoClient");
