/**
 * VAULT — Lead Management & Memory Service
 *
 * Single source of truth for job threads.
 * Manages lead state, memory flags, and conversation history.
 */

import { PrismaClient, Lead, LeadState, Customer } from "@prisma/client";
import { ExtractedEntities } from "../ai/utils/flow";

const prisma = new PrismaClient();

export interface CreateLeadParams {
  clientId: string;
  customerId: string;
}

export interface UpdateLeadFromFlowParams {
  lead: Lead;
  entities: ExtractedEntities;
}

export interface TransitionLeadStateParams {
  lead: Lead;
  newState: LeadState;
}

/**
 * Get the open (active) lead for a customer
 * Returns the most recent non-CLOSED lead, or null if none exists
 */
export async function getOpenLead(customerId: string): Promise<Lead | null> {
  const lead = await prisma.lead.findFirst({
    where: {
      customerId,
      state: {
        not: "CLOSED",
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return lead;
}

/**
 * Create a new lead for a customer
 */
export async function createLead(params: CreateLeadParams): Promise<Lead> {
  const { clientId, customerId } = params;

  const lead = await prisma.lead.create({
    data: {
      clientId,
      customerId,
      state: "NEW",
      jobType: "",
      urgency: "",
      location: "",
      requestedTime: "",
      notes: "",
      sentBooking: false,
      askedClarify: false,
      escalated: false,
    },
  });

  console.log(`📦 VAULT: Created new lead ${lead.id} for customer ${customerId}`);
  return lead;
}

/**
 * Get or create a lead for a customer
 * Returns existing open lead, or creates a new one
 */
export async function getOrCreateLead(params: CreateLeadParams): Promise<Lead> {
  const { customerId } = params;

  let lead = await getOpenLead(customerId);

  if (!lead) {
    lead = await createLead(params);
  } else {
    console.log(`📦 VAULT: Found existing lead ${lead.id} (state: ${lead.state})`);
  }

  return lead;
}

/**
 * Update lead with extracted entities from FLOW
 */
export async function updateLeadFromFlow(params: UpdateLeadFromFlowParams): Promise<Lead> {
  const { lead, entities } = params;

  const updates: Partial<Lead> = {};

  // Only update fields if they have new information
  if (entities.jobType && entities.jobType !== lead.jobType) {
    updates.jobType = entities.jobType;
  }

  if (entities.urgency && entities.urgency !== lead.urgency) {
    updates.urgency = entities.urgency;
  }

  if (entities.location && entities.location !== lead.location) {
    updates.location = entities.location;
  }

  if (entities.requestedTime && entities.requestedTime !== lead.requestedTime) {
    updates.requestedTime = entities.requestedTime;
  }

  // Append extra details to notes
  if (entities.extraDetails) {
    const existingNotes = lead.notes || "";
    const newNote = entities.extraDetails;
    if (!existingNotes.includes(newNote)) {
      updates.notes = existingNotes ? `${existingNotes}\n${newNote}` : newNote;
    }
  }

  // If there are updates, save them
  if (Object.keys(updates).length > 0) {
    const updatedLead = await prisma.lead.update({
      where: { id: lead.id },
      data: updates,
    });
    console.log(`📦 VAULT: Updated lead ${lead.id} with FLOW data`);
    return updatedLead;
  }

  return lead;
}

/**
 * Transition lead to a new state
 */
export async function transitionLeadState(params: TransitionLeadStateParams): Promise<Lead> {
  const { lead, newState } = params;

  if (lead.state === newState) {
    console.log(`📦 VAULT: Lead ${lead.id} already in state ${newState}`);
    return lead;
  }

  const updatedLead = await prisma.lead.update({
    where: { id: lead.id },
    data: { state: newState },
  });

  console.log(`📦 VAULT: Lead ${lead.id} transitioned: ${lead.state} → ${newState}`);
  return updatedLead;
}

/**
 * Mark that a booking link was sent
 */
export async function markBookingSent(leadId: string): Promise<Lead> {
  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: { sentBooking: true },
  });

  console.log(`📦 VAULT: Lead ${leadId} marked as booking sent`);
  return lead;
}

/**
 * Mark that a clarification was asked
 */
export async function markClarificationAsked(leadId: string): Promise<Lead> {
  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: { askedClarify: true },
  });

  console.log(`📦 VAULT: Lead ${leadId} marked as clarification asked`);
  return lead;
}

/**
 * Mark that lead was escalated (urgent alert sent)
 */
export async function markEscalated(leadId: string): Promise<Lead> {
  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: { escalated: true },
  });

  console.log(`📦 VAULT: Lead ${leadId} marked as escalated`);
  return lead;
}

/**
 * Close a lead (set state to CLOSED)
 */
export async function closeLead(leadId: string): Promise<Lead> {
  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: { state: "CLOSED" },
  });

  console.log(`📦 VAULT: Lead ${leadId} closed`);
  return lead;
}

/**
 * Get lead by ID
 */
export async function getLeadById(leadId: string): Promise<Lead | null> {
  return prisma.lead.findUnique({
    where: { id: leadId },
  });
}

/**
 * Get all leads for a customer (including closed)
 */
export async function getCustomerLeads(customerId: string): Promise<Lead[]> {
  return prisma.lead.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * STATE MACHINE: Determine next state based on RUNE action
 */
export function computeNextState(
  currentState: LeadState,
  action: "SEND_CLARIFY_QUESTION" | "SEND_BOOKING_LINK" | "SEND_BOOKING_AND_ALERT" | "SEND_POLITE_DECLINE"
): LeadState {
  // SEND_POLITE_DECLINE → CLOSED
  if (action === "SEND_POLITE_DECLINE") {
    return "CLOSED";
  }

  // SEND_BOOKING_AND_ALERT → URGENT
  if (action === "SEND_BOOKING_AND_ALERT") {
    return "URGENT";
  }

  // SEND_CLARIFY_QUESTION
  if (action === "SEND_CLARIFY_QUESTION") {
    if (currentState === "NEW") {
      return "NEEDS_INFO";
    }
    // If already in other states, stay there
    return currentState;
  }

  // SEND_BOOKING_LINK → AWAITING_BOOKING (if not urgent)
  if (action === "SEND_BOOKING_LINK") {
    if (currentState === "NEW" || currentState === "NEEDS_INFO") {
      return "QUALIFIED";
    }
    if (currentState === "QUALIFIED") {
      return "AWAITING_BOOKING";
    }
    // If already awaiting or urgent, stay there
    return currentState;
  }

  return currentState;
}
