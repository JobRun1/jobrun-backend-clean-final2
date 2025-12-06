import { PrismaClient } from '@prisma/client';
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
/**
 * Test database connection
 */
export declare function testDatabaseConnection(): Promise<boolean>;
/**
 * Gracefully disconnect from database
 */
export declare function disconnectDatabase(): Promise<void>;
//# sourceMappingURL=index.d.ts.map