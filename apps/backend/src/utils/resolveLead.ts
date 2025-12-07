import { PrismaClient, Lead } from "@prisma/client";

const prisma = new PrismaClient();

export interface ResolveLeadParams {
  clientId: string;
  phone: string;
  name?: string;
}

export async function resolveLead(params: ResolveLeadParams): Promise<Lead> {
  const { clientId, phone, name } = params;

  const normalizedPhone = phone.trim();

  let lead = await prisma.lead.findUnique({
    where: {
      clientId_phone: {
        clientId,
        phone: normalizedPhone,
      },
    },
  });

  if (!lead) {
    console.log(`📝 Creating new lead for ${normalizedPhone}`);
    lead = await prisma.lead.create({
      data: {
        clientId,
        phone: normalizedPhone,
        name: name || null,
        status: "NEW",
        source: "INBOUND",
      },
    });
  } else {
    console.log(`✅ Found existing lead: ${lead.id} (${lead.status})`);

    if (name && !lead.name) {
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: { name },
      });
      console.log(`📝 Updated lead name to: ${name}`);
    }
  }

  return lead;
}
