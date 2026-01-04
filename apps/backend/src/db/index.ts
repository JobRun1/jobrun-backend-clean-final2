import { PrismaClient } from '@prisma/client';

// Singleton Prisma client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  QUERY TIMEOUT MIDDLEWARE (PRODUCTION SAFETY)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Prevent slow queries from blocking webhook threads
// Twilio times out webhooks at 15 seconds
// We need queries to fail fast (5s max) to allow error handling + retry
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
prisma.$use(async (params, next) => {
  const timeout = 5000; // 5 seconds max per query

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Query timeout: ${params.model}.${params.action} exceeded ${timeout}ms`));
    }, timeout);
  });

  try {
    // Race between query execution and timeout
    const result = await Promise.race([next(params), timeoutPromise]);
    return result;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Query timeout')) {
      console.error('⏱️ Query timeout exceeded', {
        model: params.model,
        action: params.action,
        timeout,
      });
    }
    throw error;
  }
});

/**
 * Test database connection
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

/**
 * Gracefully disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
