import type { Customer } from '@prisma/client';
/**
 * Find or create a customer by phone number
 */
export declare function findOrCreateCustomer(clientId: string, phone: string, name?: string): Promise<Customer>;
/**
 * Get customer by ID
 */
export declare function getCustomerById(customerId: string): Promise<Customer | null>;
/**
 * Get all customers for a client
 */
export declare function getCustomersByClient(clientId: string): Promise<Customer[]>;
/**
 * Update customer information
 */
export declare function updateCustomer(customerId: string, data: {
    name?: string;
    email?: string;
}): Promise<Customer>;
//# sourceMappingURL=service.d.ts.map