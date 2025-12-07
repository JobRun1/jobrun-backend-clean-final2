import { Lead, LeadStatus, ClientSettings } from "@prisma/client";
import { IntentType } from "./dial";
import { ExtractedEntities } from "./flow";

export type NextAction =
  | "ASK_QUESTION"
  | "SEND_BOOKING_LINK"
  | "ACK_ONLY"
  | "NO_REPLY";

export interface DecideNextActionParams {
  lead: Lead;
  intent: IntentType;
  entities: ExtractedEntities;
  clientSettings: ClientSettings | null;
  messageCount: number;
}

export interface NextActionDecision {
  action: NextAction;
  stateEvent?: string;
  explanation?: string;
}

export async function decideNextAction(
  params: DecideNextActionParams
): Promise<NextActionDecision> {
  const { lead, intent, entities, clientSettings, messageCount } = params;

  const hasBookingUrl = !!clientSettings?.metadata &&
    typeof clientSettings.metadata === "object" &&
    "bookingUrl" in clientSettings.metadata;

  const isFirstMessage = messageCount <= 1;
  const currentStatus = lead.status;

  if (intent === "GREETING") {
    if (isFirstMessage) {
      return {
        action: "ASK_QUESTION",
        stateEvent: "CONTACTED",
        explanation: "First greeting from lead - welcome and ask how we can help",
      };
    } else {
      return {
        action: "ACK_ONLY",
        explanation: "Acknowledge greeting in ongoing conversation",
      };
    }
  }

  if (intent === "CLOSING") {
    return {
      action: "ACK_ONLY",
      explanation: "Acknowledge closing message politely",
    };
  }

  if (intent === "URGENT_PROBLEM") {
    if (hasBookingUrl && entities.jobType) {
      return {
        action: "SEND_BOOKING_LINK",
        stateEvent: "QUALIFIED",
        explanation: "Urgent problem with clear job type - send booking link immediately",
      };
    } else {
      return {
        action: "ASK_QUESTION",
        stateEvent: "CONTACTED",
        explanation: "Urgent problem but need more details about the job",
      };
    }
  }

  if (intent === "BOOKING_REQUEST") {
    if (hasBookingUrl) {
      return {
        action: "SEND_BOOKING_LINK",
        stateEvent: "QUALIFIED",
        explanation: "Clear booking request - send booking link",
      };
    } else {
      return {
        action: "ASK_QUESTION",
        explanation: "Booking request but no booking URL configured",
      };
    }
  }

  if (intent === "JOB_DESCRIPTION") {
    const hasEnoughInfo =
      entities.jobType && (entities.location || entities.extraDetails);

    if (hasEnoughInfo && hasBookingUrl) {
      return {
        action: "SEND_BOOKING_LINK",
        stateEvent: "QUALIFIED",
        explanation: "Job clearly described with enough details - send booking link",
      };
    } else {
      return {
        action: "ASK_QUESTION",
        stateEvent: "CONTACTED",
        explanation: "Job description but need more clarifying details",
      };
    }
  }

  if (intent === "QUESTION") {
    return {
      action: "ASK_QUESTION",
      stateEvent: currentStatus === "NEW" ? "CONTACTED" : undefined,
      explanation: "Customer has a question - provide helpful response",
    };
  }

  if (intent === "FOLLOW_UP") {
    if (currentStatus === "QUALIFIED" || currentStatus === "CONVERTED") {
      return {
        action: "ACK_ONLY",
        explanation: "Follow-up on qualified/converted lead - acknowledge",
      };
    } else {
      return {
        action: "ASK_QUESTION",
        stateEvent: "CONTACTED",
        explanation: "Follow-up message - continue conversation",
      };
    }
  }

  return {
    action: "ASK_QUESTION",
    stateEvent: currentStatus === "NEW" ? "CONTACTED" : undefined,
    explanation: "Default: continue conversation with helpful question",
  };
}
