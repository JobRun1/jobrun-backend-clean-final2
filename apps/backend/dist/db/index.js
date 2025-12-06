"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.testDatabaseConnection = testDatabaseConnection;
exports.disconnectDatabase = disconnectDatabase;
const client_1 = require("@prisma/client");
// Singleton Prisma client
const globalForPrisma = globalThis;
exports.prisma = globalForPrisma.prisma ??
    new client_1.PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = exports.prisma;
}
/**
 * Test database connection
 */
async function testDatabaseConnection() {
    try {
        await exports.prisma.$connect();
        await exports.prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch (error) {
        console.error('Database connection failed:', error);
        return false;
    }
}
/**
 * Gracefully disconnect from database
 */
async function disconnectDatabase() {
    await exports.prisma.$disconnect();
}
//# sourceMappingURL=index.js.map