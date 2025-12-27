-- CreateEnum
CREATE TYPE "PoolStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'RESERVED');

-- AlterTable: Add trial and Stripe fields to clients
ALTER TABLE "clients" ADD COLUMN "trialStartedAt" TIMESTAMP(3),
ADD COLUMN "trialEndsAt" TIMESTAMP(3),
ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "stripeSubscriptionId" TEXT;

-- CreateTable: AlertLog for ops alerting
CREATE TABLE "alert_logs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alertType" TEXT NOT NULL,
    "alertKey" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "resourceId" TEXT,
    "deliveredAt" TIMESTAMP(3) NOT NULL,
    "channel" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "alert_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TwilioNumberPool for number allocation
CREATE TABLE "twilio_number_pool" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "phone_e164" TEXT NOT NULL,
    "status" "PoolStatus" NOT NULL DEFAULT 'AVAILABLE',
    "client_id" TEXT,
    "assigned_at" TIMESTAMP(3),

    CONSTRAINT "twilio_number_pool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alert_logs_alertType_idx" ON "alert_logs"("alertType");

-- CreateIndex
CREATE INDEX "alert_logs_deliveredAt_idx" ON "alert_logs"("deliveredAt");

-- CreateIndex
CREATE UNIQUE INDEX "alert_logs_alertType_alertKey_key" ON "alert_logs"("alertType", "alertKey");

-- CreateIndex
CREATE UNIQUE INDEX "twilio_number_pool_phone_e164_key" ON "twilio_number_pool"("phone_e164");

-- CreateIndex
CREATE INDEX "twilio_number_pool_status_idx" ON "twilio_number_pool"("status");

-- CreateIndex
CREATE INDEX "twilio_number_pool_client_id_idx" ON "twilio_number_pool"("client_id");
