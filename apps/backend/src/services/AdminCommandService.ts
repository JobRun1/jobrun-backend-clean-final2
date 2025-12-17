import { prisma } from "../db";
import { getTwilioClient } from "../twilio/client";
import { Client, ClientSettings, Lead, Customer } from "@prisma/client";

/**
 * Admin SMS Command Service
 *
 * Handles deterministic admin commands: CALL, TEXT, PAUSE, RESUME
 * NO AI interpretation - hard logic only
 */

const FIFTEEN_MINUTES_AGO = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - 15);
  return date;
};

export type AdminCommand = "CALL" | "TEXT" | "PAUSE" | "RESUME" | "UNKNOWN";

/**
 * Parse admin command from message body
 */
export function parseAdminCommand(body: string): AdminCommand {
  const normalized = body.trim().toUpperCase();

  if (normalized === "CALL") return "CALL";
  if (normalized === "TEXT") return "TEXT";
  if (normalized === "PAUSE") return "PAUSE";
  if (normalized === "RESUME") return "RESUME";

  return "UNKNOWN";
}

/**
 * Check if sender is admin
 */
export function isAdminPhone(from: string): boolean {
  const adminPhone = process.env.ADMIN_PHONE;
  if (!adminPhone) {
    console.warn("⚠️  ADMIN_PHONE not configured in environment");
    return false;
  }
  return from === adminPhone;
}

/**
 * Find most recent active lead for admin commands
 *
 * Rules:
 * - clientId = DEFAULT_CLIENT_ID
 * - escalated = true
 * - state IN ("NEW", "URGENT")
 * - created within last 15 minutes
 * - ORDER BY createdAt DESC
 * - LIMIT 1
 */
async function findActiveLead(clientId: string): Promise<(Lead & { customer: Customer }) | null> {
  const lead = await prisma.lead.findFirst({
    where: {
      clientId,
      escalated: true,
      state: {
        in: ["NEW", "URGENT"],
      },
      createdAt: {
        gte: FIFTEEN_MINUTES_AGO(),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      customer: true,
    },
  });

  return lead;
}

/**
 * Execute CALL command
 * Initiates outbound call to customer
 */
export async function executeCallCommand(
  clientId: string,
  client: Client
): Promise<string> {
  const lead = await findActiveLead(clientId);

  if (!lead) {
    return "No active leads found.";
  }

  const twilioClient = getTwilioClient();
  const twilioNumber = process.env.TWILIO_NUMBER;

  if (!twilioNumber) {
    console.error("❌ TWILIO_NUMBER not configured");
    return "Action failed. Please try again.";
  }

  try {
    await twilioClient.calls.create({
      to: lead.customer.phone,
      from: twilioNumber,
      url: `${process.env.BASE_URL}/api/twilio/voice`,
    });

    console.log(`📞 [ADMIN CMD] CALL initiated to ${lead.customer.phone}`);
    return `Calling customer now: ${lead.customer.phone}`;
  } catch (error) {
    console.error("❌ [ADMIN CMD] Failed to initiate call:", error);
    return "Action failed. Please try again.";
  }
}

/**
 * Execute TEXT command
 * Sends SMS to customer
 */
export async function executeTextCommand(
  clientId: string,
  client: Client
): Promise<string> {
  const lead = await findActiveLead(clientId);

  if (!lead) {
    return "No active leads found.";
  }

  const twilioClient = getTwilioClient();
  const twilioNumber = process.env.TWILIO_NUMBER;

  if (!twilioNumber) {
    console.error("❌ TWILIO_NUMBER not configured");
    return "Action failed. Please try again.";
  }

  const businessName = client.businessName || "JobRun";
  const message = `Hi, this is JobRun for ${businessName}. We saw your missed call — when's a good time to talk?`;

  try {
    await twilioClient.messages.create({
      to: lead.customer.phone,
      from: twilioNumber,
      body: message,
    });

    console.log(`📤 [ADMIN CMD] TEXT sent to ${lead.customer.phone}`);
    return "Message sent to customer.";
  } catch (error) {
    console.error("❌ [ADMIN CMD] Failed to send TEXT:", error);
    return "Action failed. Please try again.";
  }
}

/**
 * Execute PAUSE command
 * Disables notifications for business owner
 */
export async function executePauseCommand(clientId: string): Promise<string> {
  try {
    await prisma.clientSettings.update({
      where: { clientId },
      data: { notificationsPaused: true },
    });

    console.log(`⏸️  [ADMIN CMD] PAUSE executed for client ${clientId}`);
    return "JobRun paused. You will no longer receive alerts. Reply RESUME to restart.";
  } catch (error) {
    console.error("❌ [ADMIN CMD] Failed to PAUSE:", error);
    return "Action failed. Please try again.";
  }
}

/**
 * Execute RESUME command
 * Re-enables notifications for business owner
 */
export async function executeResumeCommand(clientId: string): Promise<string> {
  try {
    await prisma.clientSettings.update({
      where: { clientId },
      data: { notificationsPaused: false },
    });

    console.log(`▶️  [ADMIN CMD] RESUME executed for client ${clientId}`);
    return "JobRun resumed. Alerts are active.";
  } catch (error) {
    console.error("❌ [ADMIN CMD] Failed to RESUME:", error);
    return "Action failed. Please try again.";
  }
}

/**
 * Get help text for unknown commands
 */
export function getHelpText(): string {
  return "Available commands: CALL, TEXT, PAUSE, RESUME";
}
