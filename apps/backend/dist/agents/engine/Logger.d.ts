/**
 * Logger - Records agent executions for analytics and debugging
 */
import { PrismaClient } from '@prisma/client';
import type { AgentContext, AgentExecutionResult, AgentLogEntry } from '../base/types';
export declare class AgentLogger {
    private prisma;
    private inMemoryLogs;
    private maxInMemoryLogs;
    constructor(prisma: PrismaClient);
    /**
     * Log agent execution
     */
    logExecution(agentName: string, context: AgentContext, result: AgentExecutionResult): Promise<void>;
    /**
     * Get recent logs for an agent
     */
    getRecentLogs(agentName: string, clientId: string, limit?: number): Promise<AgentLogEntry[]>;
    /**
     * Get logs for a specific customer
     */
    getCustomerLogs(customerId: string, clientId: string, limit?: number): Promise<AgentLogEntry[]>;
    /**
     * Get logs for a conversation
     */
    getConversationLogs(conversationId: string, clientId: string): Promise<AgentLogEntry[]>;
    /**
     * Get agent analytics
     */
    getAgentAnalytics(agentName: string, clientId: string, days?: number): Promise<{
        agentName: string;
        period: string;
        totalExecutions: number;
        successfulExecutions: number;
        failedExecutions: number;
        successRate: number;
        avgExecutionTimeMs: number;
    }>;
    /**
     * Add log to in-memory cache
     */
    private addToInMemoryCache;
    /**
     * Clean up old logs (for GDPR compliance)
     */
    cleanupOldLogs(daysToKeep?: number): Promise<number>;
}
//# sourceMappingURL=Logger.d.ts.map