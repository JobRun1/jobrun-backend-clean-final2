/**
 * NUMBER ROLE RESOLVER
 *
 * CRITICAL: This is the single source of truth for determining what a Twilio
 * number is used for. All routing decisions MUST use this utility.
 *
 * INVARIANT: Voice calls to ONBOARDING numbers are FORBIDDEN.
 * INVARIANT: Only explicit number roles are used - NO INFERENCE.
 */

import { prisma } from "../db";
import { TwilioNumberRole } from "@prisma/client";

// HARDCODED ONBOARDING NUMBER (SMS-only, voice calls FORBIDDEN)
const ONBOARDING_ONLY_NUMBER = "447476955179";

export interface NumberRoleInfo {
  phoneE164: string;
  role: TwilioNumberRole;
  clientId: string | null;
  source: "pool" | "client" | "hardcoded" | "unknown";
  isKnown: boolean;
}

/**
 * Resolve a phone number to its role and ownership
 *
 * Priority order:
 * 1. TwilioNumberPool (explicit role assignment)
 * 2. Client.twilioNumber (assume OPERATIONAL)
 * 3. Hardcoded ONBOARDING_ONLY_NUMBER
 * 4. Unknown (treat as SYSTEM with warnings)
 *
 * @param phoneE164 - Normalized E.164 phone number (digits only)
 * @returns NumberRoleInfo with role and ownership details
 */
export async function resolveNumberRole(
  phoneE164: string
): Promise<NumberRoleInfo> {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 1: Check TwilioNumberPool (explicit role)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const poolRecord = await prisma.twilioNumberPool.findUnique({
    where: { phoneE164 },
    select: {
      role: true,
      clientId: true,
    },
  });

  if (poolRecord) {
    console.log("📞 Number role resolved from pool:", {
      phoneE164,
      role: poolRecord.role,
      clientId: poolRecord.clientId,
      source: "pool",
    });

    return {
      phoneE164,
      role: poolRecord.role,
      clientId: poolRecord.clientId,
      source: "pool",
      isKnown: true,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 2: Check Client.twilioNumber (assume OPERATIONAL)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const clientRecord = await prisma.client.findFirst({
    where: { twilioNumber: phoneE164 },
    select: { id: true },
  });

  if (clientRecord) {
    console.log("📞 Number role resolved from Client.twilioNumber:", {
      phoneE164,
      role: "OPERATIONAL",
      clientId: clientRecord.id,
      source: "client",
    });

    return {
      phoneE164,
      role: TwilioNumberRole.OPERATIONAL,
      clientId: clientRecord.id,
      source: "client",
      isKnown: true,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 3: Hardcoded onboarding number (SMS-only)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (phoneE164 === ONBOARDING_ONLY_NUMBER) {
    console.log("📞 Number role resolved as hardcoded ONBOARDING:", {
      phoneE164,
      role: "ONBOARDING",
      source: "hardcoded",
    });

    return {
      phoneE164,
      role: TwilioNumberRole.ONBOARDING,
      clientId: null,
      source: "hardcoded",
      isKnown: true,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIORITY 4: Unknown number (treat as SYSTEM with warnings)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.warn("⚠️ UNKNOWN NUMBER: Not in pool, not assigned to client, not hardcoded", {
    phoneE164,
    assumedRole: "SYSTEM",
    warning: "This number should be registered in TwilioNumberPool",
  });

  return {
    phoneE164,
    role: TwilioNumberRole.SYSTEM,
    clientId: null,
    source: "unknown",
    isKnown: false,
  };
}

/**
 * Check if a number is allowed to receive voice calls
 *
 * INVARIANT: ONBOARDING numbers CANNOT receive voice calls
 *
 * @param numberInfo - Result from resolveNumberRole()
 * @returns true if voice calls are allowed, false otherwise
 */
export function canReceiveVoiceCall(numberInfo: NumberRoleInfo): boolean {
  // HARD RULE: Onboarding numbers are SMS-only
  if (numberInfo.role === TwilioNumberRole.ONBOARDING) {
    return false;
  }

  // All other roles can receive voice
  return true;
}

/**
 * Get a human-readable description of number role
 */
export function getNumberRoleDescription(role: TwilioNumberRole): string {
  switch (role) {
    case TwilioNumberRole.OPERATIONAL:
      return "Client's dedicated number for customer job intake";
    case TwilioNumberRole.ONBOARDING:
      return "System onboarding number (SMS-only, voice FORBIDDEN)";
    case TwilioNumberRole.SYSTEM:
      return "System/test/forwarded number (treat as operational with warnings)";
    default:
      return "Unknown role";
  }
}
