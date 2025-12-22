-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CLIENT');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('SMS', 'CALL', 'NOTE', 'EVENT');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('NEW', 'CONFIRMED', 'CANCELLED', 'MISSED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('INBOUND', 'OUTBOUND', 'REFERRAL', 'WEBSITE', 'OTHER', 'FAKE');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "CustomerState" AS ENUM ('NEW', 'POST_CALL', 'POST_CALL_REPLIED', 'CUSTOMER_REPLIED', 'QUALIFIED', 'BOOKED', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "LeadState" AS ENUM ('NEW', 'NEEDS_INFO', 'QUALIFIED', 'URGENT', 'AWAITING_BOOKING', 'CLOSED');

-- CreateEnum
CREATE TYPE "OnboardingStateEnum" AS ENUM ('S1_BUSINESS_TYPE_LOCATION', 'S2_BUSINESS_NAME', 'S3_OWNER_NAME', 'S4_NOTIFICATION_PREF', 'S5_CONFIRM_LIVE', 'S6_PHONE_TYPE', 'S7_FWD_SENT', 'S8_FWD_CONFIRM', 'S9_TEST_CALL', 'COMPLETE');

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessName" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "twilioNumber" TEXT,
    "paymentActive" BOOLEAN NOT NULL DEFAULT false,
    "businessHours" JSONB,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "demoToolsVisible" BOOLEAN NOT NULL DEFAULT true,
    "demoClient" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "clientId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "state" "CustomerState" NOT NULL DEFAULT 'NEW',

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "customerId" TEXT,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT NOT NULL,
    "customerId" TEXT,
    "conversationId" TEXT,
    "direction" "MessageDirection" NOT NULL,
    "type" "MessageType" NOT NULL,
    "body" TEXT NOT NULL,
    "twilioSid" TEXT,
    "metadata" JSONB,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "customerId" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'NEW',
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "notes" TEXT,
    "color" VARCHAR,
    "recurrenceRuleId" VARCHAR,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "externalSyncId" VARCHAR,
    "externalCalendar" VARCHAR,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurrence_rules" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "frequency" "RecurrenceFrequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "byWeekday" TEXT,
    "byMonthday" TEXT,
    "endDate" TIMESTAMP(3),
    "occurrences" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurrence_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_availability" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "weekly_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_times" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "start" TEXT,
    "end" TEXT,
    "reason" TEXT,

    CONSTRAINT "blocked_times_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_logs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentName" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "customerId" TEXT,
    "conversationId" TEXT,
    "trigger" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "executionTimeMs" INTEGER NOT NULL,

    CONSTRAINT "agent_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_settings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "businessName" TEXT,
    "services" TEXT,
    "availability" TEXT,
    "pricing" TEXT,
    "phoneNumber" TEXT,
    "email" TEXT,
    "website" TEXT,
    "serviceArea" TEXT,
    "theme" JSONB,
    "agentSettings" JSONB,
    "metadata" JSONB,
    "notificationsPaused" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "client_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "state" "LeadState" NOT NULL DEFAULT 'NEW',
    "jobType" TEXT NOT NULL DEFAULT '',
    "urgency" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "requestedTime" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "sentBooking" BOOLEAN NOT NULL DEFAULT false,
    "askedClarify" BOOLEAN NOT NULL DEFAULT false,
    "escalated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impersonation_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "impersonation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handover_states" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "conversationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL,
    "reason" TEXT,
    "urgencyScore" INTEGER NOT NULL DEFAULT 5,
    "triggers" JSONB,
    "lastNotificationAt" TIMESTAMP(3),

    CONSTRAINT "handover_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_states" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "client_id" TEXT NOT NULL,
    "current_state" "OnboardingStateEnum" NOT NULL DEFAULT 'S1_BUSINESS_TYPE_LOCATION',
    "collected_fields" JSONB NOT NULL DEFAULT '{}',
    "last_message_sid" TEXT,
    "completed_at" TIMESTAMP(3),
    "phone_type" TEXT,
    "forwarding_enabled" BOOLEAN NOT NULL DEFAULT false,
    "test_call_detected" BOOLEAN NOT NULL DEFAULT false,
    "stuck_detected_at" TIMESTAMP(3),

    CONSTRAINT "onboarding_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_logs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alert_type" TEXT NOT NULL,
    "alert_key" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "resource_id" TEXT,
    "metadata" JSONB,
    "delivered_at" TIMESTAMP(3) NOT NULL,
    "channel" TEXT NOT NULL,

    CONSTRAINT "alert_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "twilio_number_pool" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "phone_e164" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "client_id" TEXT,
    "reserved_at" TIMESTAMP(3),
    "assigned_at" TIMESTAMP(3),

    CONSTRAINT "twilio_number_pool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_phoneNumber_key" ON "clients"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "clients_twilioNumber_key" ON "clients"("twilioNumber");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "customers_clientId_idx" ON "customers"("clientId");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_state_idx" ON "customers"("state");

-- CreateIndex
CREATE UNIQUE INDEX "customers_clientId_phone_key" ON "customers"("clientId", "phone");

-- CreateIndex
CREATE INDEX "conversations_clientId_idx" ON "conversations"("clientId");

-- CreateIndex
CREATE INDEX "conversations_customerId_idx" ON "conversations"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "messages_twilioSid_key" ON "messages"("twilioSid");

-- CreateIndex
CREATE INDEX "messages_clientId_idx" ON "messages"("clientId");

-- CreateIndex
CREATE INDEX "messages_customerId_idx" ON "messages"("customerId");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE INDEX "bookings_clientId_start_idx" ON "bookings"("clientId", "start");

-- CreateIndex
CREATE INDEX "bookings_clientId_status_idx" ON "bookings"("clientId", "status");

-- CreateIndex
CREATE INDEX "bookings_customerId_idx" ON "bookings"("customerId");

-- CreateIndex
CREATE INDEX "bookings_recurrenceRuleId_idx" ON "bookings"("recurrenceRuleId");

-- CreateIndex
CREATE INDEX "bookings_isAllDay_idx" ON "bookings"("isAllDay");

-- CreateIndex
CREATE INDEX "agent_logs_clientId_idx" ON "agent_logs"("clientId");

-- CreateIndex
CREATE INDEX "agent_logs_agentName_idx" ON "agent_logs"("agentName");

-- CreateIndex
CREATE INDEX "agent_logs_customerId_idx" ON "agent_logs"("customerId");

-- CreateIndex
CREATE INDEX "agent_logs_conversationId_idx" ON "agent_logs"("conversationId");

-- CreateIndex
CREATE INDEX "agent_logs_createdAt_idx" ON "agent_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "client_settings_clientId_key" ON "client_settings"("clientId");

-- CreateIndex
CREATE INDEX "leads_clientId_idx" ON "leads"("clientId");

-- CreateIndex
CREATE INDEX "leads_customerId_idx" ON "leads"("customerId");

-- CreateIndex
CREATE INDEX "leads_state_idx" ON "leads"("state");

-- CreateIndex
CREATE UNIQUE INDEX "leads_clientId_customerId_key" ON "leads"("clientId", "customerId");

-- CreateIndex
CREATE INDEX "impersonation_logs_adminId_idx" ON "impersonation_logs"("adminId");

-- CreateIndex
CREATE INDEX "impersonation_logs_clientId_idx" ON "impersonation_logs"("clientId");

-- CreateIndex
CREATE INDEX "impersonation_logs_createdAt_idx" ON "impersonation_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "handover_states_conversationId_key" ON "handover_states"("conversationId");

-- CreateIndex
CREATE INDEX "handover_states_clientId_idx" ON "handover_states"("clientId");

-- CreateIndex
CREATE INDEX "handover_states_active_idx" ON "handover_states"("active");

-- CreateIndex
CREATE INDEX "handover_states_urgencyScore_idx" ON "handover_states"("urgencyScore");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_states_client_id_key" ON "onboarding_states"("client_id");

-- CreateIndex
CREATE INDEX "onboarding_states_current_state_idx" ON "onboarding_states"("current_state");

-- CreateIndex
CREATE INDEX "onboarding_states_last_message_sid_idx" ON "onboarding_states"("last_message_sid");

-- CreateIndex
CREATE INDEX "alert_logs_alert_type_idx" ON "alert_logs"("alert_type");

-- CreateIndex
CREATE INDEX "alert_logs_delivered_at_idx" ON "alert_logs"("delivered_at");

-- CreateIndex
CREATE UNIQUE INDEX "alert_logs_alert_type_alert_key_key" ON "alert_logs"("alert_type", "alert_key");

-- CreateIndex
CREATE UNIQUE INDEX "twilio_number_pool_phone_e164_key" ON "twilio_number_pool"("phone_e164");

-- CreateIndex
CREATE UNIQUE INDEX "twilio_number_pool_client_id_key" ON "twilio_number_pool"("client_id");

-- CreateIndex
CREATE INDEX "twilio_number_pool_status_idx" ON "twilio_number_pool"("status");

-- CreateIndex
CREATE INDEX "twilio_number_pool_client_id_idx" ON "twilio_number_pool"("client_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_recurrenceRuleId_fkey" FOREIGN KEY ("recurrenceRuleId") REFERENCES "recurrence_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_states" ADD CONSTRAINT "onboarding_states_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

