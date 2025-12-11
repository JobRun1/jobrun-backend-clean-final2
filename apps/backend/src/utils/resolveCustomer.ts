import { PrismaClient, Customer } from "@prisma/client";

const prisma = new PrismaClient();

export interface ResolveCustomerParams {
  clientId: string;
  phone: string;
  name?: string;
}

export async function resolveCustomer(params: ResolveCustomerParams): Promise<Customer> {
  const { clientId, phone, name } = params;

  const normalizedPhone = phone.trim();

  let customer = await prisma.customer.findUnique({
    where: {
      clientId_phone: {
        clientId,
        phone: normalizedPhone,
      },
    },
  });

  if (!customer) {
    console.log(`📝 Creating new customer for ${normalizedPhone}`);
    customer = await prisma.customer.create({
      data: {
        clientId,
        phone: normalizedPhone,
        name: name || null,
        state: "NEW",
      },
    });
  } else {
    console.log(`✅ Found existing customer: ${customer.id} (${customer.state})`);

    if (name && !customer.name) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: { name },
      });
      console.log(`📝 Updated customer name to: ${name}`);
    }
  }

  return customer;
}
