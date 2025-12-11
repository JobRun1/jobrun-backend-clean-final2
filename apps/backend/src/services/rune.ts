/**
 * RUNE — Decision Engine for JobRun
 *
 * Takes intent classification (DIAL), extracted data (FLOW), and client config
 * to decide exactly ONE action for the inbound SMS pipeline.
 */

export type IntentType = "NORMAL" | "URGENT" | "UNCLEAR" | "NON_LEAD";

export type RuneAction =
  | "SEND_CLARIFY_QUESTION"
  | "SEND_BOOKING_LINK"
  | "SEND_BOOKING_AND_ALERT"
  | "SEND_POLITE_DECLINE";

export interface FlowData {
  job_type?: string;
  urgency_description?: string;
  location?: string;
  requested_time?: string;
  customer_name?: string;
  extra_notes?: string;
  confidence?: number;
}

export interface ClientConfig {
  booking_link_enabled: boolean;
}

export interface RuneInput {
  intent: IntentType;
  certainty: number;
  flow: FlowData;
  config: ClientConfig;
}

export interface RuneOutput {
  action: RuneAction;
  reason: string;
}

/**
 * Main RUNE decision function
 * Implements strict decision rules as specified
 */
export function decideAction(input: RuneInput): RuneOutput {
  const { intent, flow, config } = input;

  // RULE 1: NON_LEAD → SEND_POLITE_DECLINE
  if (intent === "NON_LEAD") {
    return {
      action: "SEND_POLITE_DECLINE",
      reason: "non lead",
    };
  }

  // RULE 2: URGENT → SEND_BOOKING_AND_ALERT
  if (intent === "URGENT") {
    return {
      action: "SEND_BOOKING_AND_ALERT",
      reason: "urgent intent",
    };
  }

  // RULE 3: Check urgency_description for dangerous situations
  const urgencyDesc = flow.urgency_description?.toLowerCase() || "";
  const dangerKeywords = [
    "flooding",
    "flood",
    "water leak",
    "leak worsening",
    "getting worse",
    "no heating",
    "lockout",
    "locked out",
    "power out",
    "no power",
    "smoke",
    "smell burning",
    "burning smell",
    "fire",
    "gas leak",
    "water everywhere",
  ];

  const hasDangerIndicator = dangerKeywords.some((keyword) =>
    urgencyDesc.includes(keyword)
  );

  if (hasDangerIndicator) {
    return {
      action: "SEND_BOOKING_AND_ALERT",
      reason: "flood risk",
    };
  }

  // RULE 4: UNCLEAR → SEND_CLARIFY_QUESTION
  if (intent === "UNCLEAR") {
    return {
      action: "SEND_CLARIFY_QUESTION",
      reason: "intent unclear",
    };
  }

  // RULE 5: No job_type → SEND_CLARIFY_QUESTION
  if (!flow.job_type || flow.job_type.trim() === "") {
    return {
      action: "SEND_CLARIFY_QUESTION",
      reason: "job unclear",
    };
  }

  // RULE 6: NORMAL + job_type + booking_link_enabled → SEND_BOOKING_LINK
  if (intent === "NORMAL" && config.booking_link_enabled) {
    return {
      action: "SEND_BOOKING_LINK",
      reason: "normal booking",
    };
  }

  // RULE 7: NORMAL + job_type + NO booking_link → SEND_CLARIFY_QUESTION (fallback)
  if (intent === "NORMAL" && !config.booking_link_enabled) {
    return {
      action: "SEND_CLARIFY_QUESTION",
      reason: "no booking link",
    };
  }

  // DEFAULT FALLBACK (should rarely reach here)
  return {
    action: "SEND_CLARIFY_QUESTION",
    reason: "default fallback",
  };
}
