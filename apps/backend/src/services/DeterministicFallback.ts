/**
 * PHASE 3: AI FALLBACK STRATEGY
 *
 * Deterministic fallback system when OpenAI is unavailable or aiDisabled = true.
 * Provides keyword-based classification and static message templates.
 *
 * DESIGN PHILOSOPHY:
 * - No LLM calls, pure deterministic logic
 * - Keyword matching + regex patterns
 * - Static message templates with variable interpolation
 * - System remains functional end-to-end, just less sophisticated
 *
 * USE CASES:
 * - OpenAI downtime (503 errors)
 * - Client has aiDisabled flag set
 * - Cost control during high-volume periods
 * - Debugging AI issues
 */

export type IntentType = "URGENT" | "NORMAL" | "UNCLEAR" | "NON_LEAD";
export type RuneAction =
  | "SEND_BOOKING_LINK"
  | "SEND_BOOKING_AND_ALERT"
  | "SEND_CLARIFY_QUESTION"
  | "SEND_POLITE_DECLINE";

/**
 * Entities extracted via deterministic patterns.
 */
export interface DeterministicEntities {
  jobType: string;
  urgency: string;
  location: string;
  requestedTime: string;
  customerName: string;
  extraDetails: string;
}

/**
 * DETERMINISTIC DIAL: Keyword-based intent classification.
 *
 * Replaces AI-based DIAL when OpenAI unavailable.
 * Uses simple keyword matching to classify intent.
 *
 * @param messageText - Customer's SMS message
 * @returns Intent classification
 */
export function classifyIntentDeterministic(messageText: string): {
  intent: IntentType;
  confidence: number;
} {
  const text = messageText.toLowerCase().trim();

  // RULE 1: Empty or very short messages → UNCLEAR
  if (text.length < 3) {
    return { intent: "UNCLEAR", confidence: 0.8 };
  }

  // RULE 2: Urgent keywords → URGENT
  const urgentKeywords = [
    "urgent",
    "emergency",
    "asap",
    "right now",
    "immediately",
    "flooding",
    "flood",
    "leak",
    "no heat",
    "lockout",
    "locked out",
    "power out",
    "smoke",
    "fire",
    "gas leak",
  ];

  if (urgentKeywords.some((keyword) => text.includes(keyword))) {
    return { intent: "URGENT", confidence: 0.9 };
  }

  // RULE 3: Non-lead indicators → NON_LEAD
  const nonLeadKeywords = [
    "spam",
    "unsubscribe",
    "stop",
    "wrong number",
    "not interested",
    "remove me",
  ];

  if (nonLeadKeywords.some((keyword) => text.includes(keyword))) {
    return { intent: "NON_LEAD", confidence: 0.85 };
  }

  // RULE 4: Service request indicators → NORMAL
  const serviceKeywords = [
    "quote",
    "price",
    "cost",
    "book",
    "appointment",
    "schedule",
    "repair",
    "fix",
    "install",
    "service",
    "estimate",
    "help with",
    "need",
  ];

  if (serviceKeywords.some((keyword) => text.includes(keyword))) {
    return { intent: "NORMAL", confidence: 0.75 };
  }

  // RULE 5: Question indicators → NORMAL (lower confidence)
  if (text.includes("?") || text.startsWith("can you") || text.startsWith("do you")) {
    return { intent: "NORMAL", confidence: 0.6 };
  }

  // DEFAULT: UNCLEAR (conservative fallback)
  return { intent: "UNCLEAR", confidence: 0.5 };
}

/**
 * DETERMINISTIC FLOW: Pattern-based entity extraction.
 *
 * Replaces AI-based FLOW when OpenAI unavailable.
 * Uses regex patterns to extract structured data.
 *
 * @param messageText - Customer's SMS message
 * @returns Extracted entities
 */
export function extractEntitiesDeterministic(messageText: string): DeterministicEntities {
  const text = messageText.toLowerCase();

  // Extract job type (first service keyword found)
  let jobType = "";
  const jobKeywords = [
    "plumbing",
    "plumber",
    "leak",
    "drain",
    "toilet",
    "sink",
    "electrical",
    "electrician",
    "wiring",
    "outlet",
    "heating",
    "boiler",
    "furnace",
    "hvac",
    "roofing",
    "roof",
    "carpentry",
    "locksmith",
    "lock",
    "key",
  ];

  for (const keyword of jobKeywords) {
    if (text.includes(keyword)) {
      jobType = keyword;
      break;
    }
  }

  // Extract urgency description (first urgent phrase found)
  let urgency = "";
  const urgencyPhrases = [
    "emergency",
    "urgent",
    "asap",
    "right now",
    "flooding",
    "leak",
    "no heat",
    "lockout",
  ];

  for (const phrase of urgencyPhrases) {
    if (text.includes(phrase)) {
      urgency = phrase;
      break;
    }
  }

  // Extract location (simple city name pattern)
  let location = "";
  const locationMatch = text.match(/\b(in|at|near)\s+([a-z\s]+?)\b/i);
  if (locationMatch) {
    location = locationMatch[2].trim();
  }

  // Extract time references
  let requestedTime = "";
  const timeKeywords = ["today", "tomorrow", "tonight", "this week", "next week", "monday", "tuesday"];
  for (const keyword of timeKeywords) {
    if (text.includes(keyword)) {
      requestedTime = keyword;
      break;
    }
  }

  // Extract customer name (simple pattern: "I'm X" or "This is X")
  let customerName = "";
  const nameMatch = text.match(/\b(i'm|this is|my name is)\s+([a-z]+)/i);
  if (nameMatch) {
    customerName = nameMatch[2].trim();
  }

  return {
    jobType,
    urgency,
    location,
    requestedTime,
    customerName,
    extraDetails: "", // Not extracted deterministically
  };
}

/**
 * DETERMINISTIC LYRA: Static message templates.
 *
 * Replaces AI-based LYRA when OpenAI unavailable.
 * Uses predefined templates with variable substitution.
 *
 * @param action - RUNE decision action
 * @param businessName - Client's business name
 * @param bookingUrl - Booking URL (if applicable)
 * @param entities - Extracted entities
 * @returns Generated SMS message
 */
export function generateReplyDeterministic(
  action: RuneAction,
  businessName: string,
  bookingUrl?: string,
  entities?: DeterministicEntities
): string {
  const name = businessName || "our team";

  switch (action) {
    case "SEND_BOOKING_LINK":
      if (bookingUrl) {
        return `Hi! Thanks for reaching out to ${name}. We'd be happy to help${
          entities?.jobType ? ` with your ${entities.jobType}` : ""
        }. Book a time that works for you: ${bookingUrl}`;
      } else {
        // Fallback if booking URL missing (shouldn't happen, but defensive)
        return `Hi! Thanks for reaching out to ${name}. We'd love to help. Can you tell us a bit more about what you need?`;
      }

    case "SEND_BOOKING_AND_ALERT":
      if (bookingUrl) {
        return `Thanks for contacting ${name}. We've received your${
          entities?.urgency ? " urgent" : ""
        } request${entities?.jobType ? ` for ${entities.jobType}` : ""}. Book here: ${bookingUrl} - We'll also reach out shortly.`;
      } else {
        return `Thanks for contacting ${name}. We've received your${
          entities?.urgency ? " urgent" : ""
        } request. Someone from our team will contact you shortly.`;
      }

    case "SEND_CLARIFY_QUESTION":
      return `Hi! Thanks for reaching out to ${name}. To help you better, could you tell us what service you need? (e.g., plumbing, electrical, heating)`;

    case "SEND_POLITE_DECLINE":
      return `Thank you for your message. We appreciate you reaching out, but we're unable to assist with this request at this time.`;

    default:
      // Defensive fallback
      return `Thank you for contacting ${name}. We've received your message and will get back to you soon.`;
  }
}

/**
 * Logs when deterministic fallback is used (for monitoring).
 *
 * @param reason - Why fallback was triggered
 * @param clientId - Client ID
 */
export function logDeterministicFallback(reason: string, clientId: string): void {
  console.log(`[DeterministicFallback] ACTIVATED:`, {
    reason,
    clientId,
    timestamp: new Date().toISOString(),
  });

  // TODO: In production, track fallback usage for monitoring
  // - Count fallback activations per hour
  // - Alert if fallback rate exceeds threshold (OpenAI outage)
  // - Track accuracy: compare fallback decisions vs AI decisions
}
