"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOrCreateCustomer = findOrCreateCustomer;
exports.getCustomerById = getCustomerById;
exports.getCustomersByClient = getCustomersByClient;
exports.updateCustomer = updateCustomer;
const db_1 = require("../../db");
const logger_1 = require("../../utils/logger");
/**
 * Find or create a customer by phone number
 */
async function findOrCreateCustomer(clientId, phone, name) {
    try {
        // Try to find existing customer
        let customer = await db_1.prisma.customer.findUnique({
            where: {
                clientId_phone: {
                    clientId,
                    phone,
                },
            },
        });
        if (customer) {
            logger_1.logger.debug('Found existing customer', { customerId: customer.id, phone });
            // Update name if provided and not already set
            if (name && !customer.name) {
                customer = await db_1.prisma.customer.update({
                    where: { id: customer.id },
                    data: { name },
                });
                logger_1.logger.info('Updated customer name', { customerId: customer.id, name });
            }
            return customer;
        }
        // Create new customer
        customer = await db_1.prisma.customer.create({
            data: {
                clientId,
                phone,
                name: name || null,
            },
        });
        logger_1.logger.info('Created new customer', {
            customerId: customer.id,
            phone,
            clientId,
        });
        return customer;
    }
    catch (error) {
        logger_1.logger.error('Error in findOrCreateCustomer', error);
        throw error;
    }
}
/**
 * Get customer by ID
 */
async function getCustomerById(customerId) {
    return db_1.prisma.customer.findUnique({
        where: { id: customerId },
    });
}
/**
 * Get all customers for a client
 */
async function getCustomersByClient(clientId) {
    return db_1.prisma.customer.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
    });
}
/**
 * Update customer information
 */
async function updateCustomer(customerId, data) {
    return db_1.prisma.customer.update({
        where: { id: customerId },
        data,
    });
}
//# sourceMappingURL=service.js.map