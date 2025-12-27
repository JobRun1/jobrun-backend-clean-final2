/**
 * TWILIO NUMBER POOL SERVICE
 *
 * Provides atomic allocation of Twilio numbers from the pool.
 * Uses database transactions with FOR UPDATE SKIP LOCKED for concurrency safety.
 *
 * Key guarantees:
 * - One number per client (enforced by unique constraint)
 * - No race conditions (via FOR UPDATE SKIP LOCKED)
 * - Idempotent (if client already has number, returns existing)
 * - Logged for observability
 */

import { prisma } from "../db";
import { AlertService, AlertTemplates } from "./AlertService";

export interface AllocationResult {
  success: boolean;
  phoneE164: string | null;
  reason: string;
  clientId: string;
}

/**
 * Allocate a Twilio number from the pool to a client
 *
 * Algorithm:
 * 1. Check if client already has an assigned number (idempotency)
 * 2. Start transaction
 * 3. SELECT one AVAILABLE row FOR UPDATE SKIP LOCKED
 * 4. Update row: status=ASSIGNED, clientId, assignedAt
 * 5. Update Client.twilioNumber
 * 6. Commit transaction
 *
 * @param clientId - Client to allocate number for
 * @returns AllocationResult with phoneE164 or null if pool empty
 */
export async function allocateTwilioNumber(
  clientId: string
): Promise<AllocationResult> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📞 [POOL] Allocating Twilio number");
  console.log(`   Client ID: ${clientId}`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 0: Idempotency check - does client already have a number?
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const existingClient = await prisma.client.findUnique({
    where: { id: clientId },
    select: { twilioNumber: true },
  });

  if (!existingClient) {
    console.error("❌ [POOL] Client not found:", clientId);
    return {
      success: false,
      phoneE164: null,
      reason: "CLIENT_NOT_FOUND",
      clientId,
    };
  }

  if (existingClient.twilioNumber) {
    console.log("✅ [POOL] Client already has number (idempotent):", existingClient.twilioNumber);
    return {
      success: true,
      phoneE164: existingClient.twilioNumber,
      reason: "ALREADY_ASSIGNED",
      clientId,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 1: Atomic allocation via transaction
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Find one available number using raw SQL for FOR UPDATE SKIP LOCKED
      // This ensures no race conditions when multiple clients try to allocate simultaneously
      const availableNumbers = await tx.$queryRaw<
        Array<{ id: string; phone_e164: string }>
      >`
        SELECT id, phone_e164
        FROM twilio_number_pool
        WHERE status = 'AVAILABLE'
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;

      if (availableNumbers.length === 0) {
        console.error("❌ [POOL] POOL_EMPTY - No available numbers");

        // CRITICAL ALERT: Pool is empty - revenue-impacting
        // Get pool stats for alert context
        const stats = await getPoolStats();
        await AlertService.sendCriticalAlert(
          AlertTemplates.poolEmpty(0, stats.byStatus?.ASSIGNED || 0)
        );

        return null;
      }

      const selectedNumber = availableNumbers[0];
      const phoneE164 = selectedNumber.phone_e164;

      console.log(`📞 [POOL] Selected number: ${phoneE164}`);

      // Update pool record: AVAILABLE → ASSIGNED
      await tx.twilioNumberPool.update({
        where: { id: selectedNumber.id },
        data: {
          status: "ASSIGNED",
          clientId: clientId,
          assignedAt: new Date(),
        },
      });

      // Update client record with assigned number
      await tx.client.update({
        where: { id: clientId },
        data: {
          twilioNumber: phoneE164,
        },
      });

      console.log("✅ [POOL] Number assigned successfully");
      console.log(`   Client: ${clientId}`);
      console.log(`   Number: ${phoneE164}`);

      return phoneE164;
    });

    if (result === null) {
      console.log("POOL_EMPTY", {
        clientId,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        phoneE164: null,
        reason: "POOL_EMPTY",
        clientId,
      };
    }

    console.log("POOL_ALLOCATION_SUCCESS", {
      clientId,
      phoneE164: result,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      phoneE164: result,
      reason: "ALLOCATED",
      clientId,
    };
  } catch (error) {
    console.error("❌ [POOL] Allocation failed:", error);
    console.error("POOL_ALLOCATION_ERROR", {
      clientId,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      phoneE164: null,
      reason: "ALLOCATION_ERROR",
      clientId,
    };
  }
}

/**
 * Get pool statistics (for monitoring/debugging)
 */
export async function getPoolStats() {
  const stats = await prisma.twilioNumberPool.groupBy({
    by: ["status"],
    _count: true,
  });

  const totalCount = await prisma.twilioNumberPool.count();

  return {
    total: totalCount,
    byStatus: stats.reduce(
      (acc, stat) => {
        acc[stat.status] = stat._count;
        return acc;
      },
      {} as Record<string, number>
    ),
  };
}

/**
 * Check if pool needs refilling (for monitoring)
 */
export async function checkPoolHealth(): Promise<{
  healthy: boolean;
  availableCount: number;
  warningThreshold: number;
}> {
  const availableCount = await prisma.twilioNumberPool.count({
    where: { status: "AVAILABLE" },
  });

  const warningThreshold = 3; // Warn if less than 3 numbers available

  return {
    healthy: availableCount >= warningThreshold,
    availableCount,
    warningThreshold,
  };
}
