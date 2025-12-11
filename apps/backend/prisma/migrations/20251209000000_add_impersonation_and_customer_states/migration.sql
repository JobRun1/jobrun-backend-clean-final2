-- CreateTable for ImpersonationLog
CREATE TABLE IF NOT EXISTS "impersonation_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "impersonation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "impersonation_logs_adminId_idx" ON "impersonation_logs"("adminId");
CREATE INDEX IF NOT EXISTS "impersonation_logs_clientId_idx" ON "impersonation_logs"("clientId");
CREATE INDEX IF NOT EXISTS "impersonation_logs_createdAt_idx" ON "impersonation_logs"("createdAt");

-- AlterEnum: Add new CustomerState values
ALTER TYPE "CustomerState" ADD VALUE IF NOT EXISTS 'POST_CALL';
ALTER TYPE "CustomerState" ADD VALUE IF NOT EXISTS 'POST_CALL_REPLIED';
ALTER TYPE "CustomerState" ADD VALUE IF NOT EXISTS 'CUSTOMER_REPLIED';
