import { Lead } from "@prisma/client";

export interface SentinelGuardParams {
  clientId: string;
  lead: Lead;
  messageText: string;
}

export interface SentinelGuardResult {
  allowed: boolean;
  reason?: string;
}

const PROFANITY_PATTERNS = [
  /\b(fuck|shit|damn|bitch|asshole|bastard|cunt)\b/gi,
];

const UNSAFE_PATTERNS = [
  /\b(kill|murder|bomb|attack|threat|harm)\b/gi,
  /\b(hack|exploit|malware|virus)\b/gi,
];

const SPAM_PATTERNS = [
  /\b(click here|buy now|limited time|act now)\b/gi,
  /\b(viagra|casino|lottery|prize)\b/gi,
  /(http[s]?:\/\/[^\s]{3,})\s+(http[s]?:\/\/[^\s]{3,})/gi,
];

export async function runSentinelGuard(
  params: SentinelGuardParams
): Promise<SentinelGuardResult> {
  const { messageText } = params;
  const normalized = messageText.toLowerCase().trim();

  if (normalized.length === 0) {
    return {
      allowed: false,
      reason: "Empty message",
    };
  }

  if (normalized.length > 1600) {
    return {
      allowed: false,
      reason: "Message too long (SMS limit: 1600 chars)",
    };
  }

  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        allowed: false,
        reason: "Message contains unsafe content",
      };
    }
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        allowed: false,
        reason: "Message appears to be spam",
      };
    }
  }

  const profanityCount = PROFANITY_PATTERNS.reduce((count, pattern) => {
    const matches = normalized.match(pattern);
    return count + (matches ? matches.length : 0);
  }, 0);

  if (profanityCount > 3) {
    return {
      allowed: false,
      reason: "Excessive profanity detected",
    };
  }

  return {
    allowed: true,
  };
}
