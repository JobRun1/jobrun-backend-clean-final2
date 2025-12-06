import { prisma } from '../../db';
import { logger } from '../../utils/logger';
import type { Customer } from '@prisma/client';

/**
 * Find or create a customer by phone number
 */
export async function findOrCreateCustomer(
  clientId: string,
  phone: string,
  name?: string
): Promise<Customer> {
  try {
    // Try to find existing customer
    let customer = await prisma.customer.findUnique({
      where: {
        clientId_phone: {
          clientId,
          phone,
        },
      },
    });

    if (customer) {
      logger.debug('Found existing customer', { customerId: customer.id, phone });

      // Update name if provided and not already set
      if (name && !customer.name) {
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: { name },
        });
        logger.info('Updated customer name', { customerId: customer.id, name });
      }

      return customer;
    }

    // Create new customer
    customer = await prisma.customer.create({
      data: {
        clientId,
        phone,
        name: name || null,
      },
    });

    logger.info('Created new customer', {
      customerId: customer.id,
      phone,
      clientId,
    });

    return customer;
  } catch (error) {
    logger.error('Error in findOrCreateCustomer', error as Error);
    throw error;
  }
}

/**
 * Get customer by ID
 */
export async function getCustomerById(customerId: string): Promise<Customer | null> {
  return prisma.customer.findUnique({
    where: { id: customerId },
  });
}

/**
 * Get all customers for a client
 */
export async function getCustomersByClient(clientId: string): Promise<Customer[]> {
  return prisma.customer.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Update customer information
 */
export async function updateCustomer(
  customerId: string,
  data: { name?: string; email?: string }
): Promise<Customer> {
  return prisma.customer.update({
    where: { id: customerId },
    data,
  });
}
