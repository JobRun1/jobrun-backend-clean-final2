import { Customer } from "@prisma/client";
import { prisma } from "../db";

export interface ResolveCustomerParams {
  clientId: string;
  phone: string;
  name?: string;
}

export async function resolveCustomer(params: ResolveCustomerParams): Promise<Customer> {
  const { clientId, phone, name } = params;

  const normalizedPhone = phone.trim();

  const customer = await prisma.customer.upsert({
    where: {
      clientId_phone: {
        clientId,
        phone: normalizedPhone,
      },
    },
    update: name && name.trim() ? { name: name.trim() } : {},
    create: {
      clientId,
      phone: normalizedPhone,
      name: name?.trim() || null,
      state: "NEW",
    },
  });

  console.log(`✅ Resolved customer: ${customer.id} (${customer.state})`);

  return customer;
}
