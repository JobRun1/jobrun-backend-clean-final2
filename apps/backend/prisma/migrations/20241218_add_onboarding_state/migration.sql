-- CreateEnum for OnboardingState
CREATE TYPE "OnboardingState" AS ENUM (
  'S1_BUSINESS_TYPE_LOCATION',
  'S2_BUSINESS_NAME',
  'S3_OWNER_NAME',
  'S4_NOTIFICATION_PREF',
  'S5_CONFIRM_LIVE',
  'COMPLETE'
);

-- CreateTable for onboarding tracking
CREATE TABLE "onboarding_states" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    "customer_id" TEXT NOT NULL,
    "current_state" "OnboardingState" NOT NULL DEFAULT 'S1_BUSINESS_TYPE_LOCATION',

    -- Collected fields (JSON)
    "collected_fields" JSONB NOT NULL DEFAULT '{}',

    -- Idempotency tracking
    "last_message_sid" TEXT,

    -- Completion tracking
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "onboarding_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_states_customer_id_key" ON "onboarding_states"("customer_id");

-- CreateIndex
CREATE INDEX "onboarding_states_current_state_idx" ON "onboarding_states"("current_state");

-- CreateIndex
CREATE INDEX "onboarding_states_last_message_sid_idx" ON "onboarding_states"("last_message_sid");

-- AddForeignKey
ALTER TABLE "onboarding_states" ADD CONSTRAINT "onboarding_states_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
