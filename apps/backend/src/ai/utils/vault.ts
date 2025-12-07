import { PrismaClient, Lead, Message } from "@prisma/client";

const prisma = new PrismaClient();

export interface LeadContext {
  lead: Lead;
  messages: Message[];
}

export interface GetLeadContextParams {
  clientId: string;
  leadId: string;
}

export async function getLeadContext(
  params: GetLeadContextParams
): Promise<LeadContext> {
  const { clientId, leadId } = params;

  const lead = await prisma.lead.findUnique({
    where: {
      id: leadId,
    },
  });

  if (!lead || lead.clientId !== clientId) {
    throw new Error(`Lead ${leadId} not found or access denied`);
  }

  const messages = await prisma.message.findMany({
    where: {
      clientId,
      customerId: lead.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });

  return {
    lead,
    messages: messages.reverse(),
  };
}
