"use strict";
/**
 * Logger - Records agent executions for analytics and debugging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentLogger = void 0;
class AgentLogger {
    prisma;
    inMemoryLogs = [];
    maxInMemoryLogs = 1000;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Log agent execution
     */
    async logExecution(agentName, context, result) {
        try {
            const logEntry = await this.prisma.agentLog.create({
                data: {
                    agentName,
                    clientId: context.clientId,
                    customerId: context.customerId,
                    conversationId: context.conversationId,
                    trigger: context.trigger,
                    input: context.input,
                    output: result.output ? result.output : null,
                    error: result.error,
                    executionTimeMs: result.executionTimeMs,
                    createdAt: result.timestamp,
                },
            });
            // Also keep in memory for quick access
            this.addToInMemoryCache(logEntry);
        }
        catch (error) {
            console.error('Failed to log agent execution:', error);
            // Don't throw - logging failures shouldn't break agent execution
        }
    }
    /**
     * Get recent logs for an agent
     */
    async getRecentLogs(agentName, clientId, limit = 50) {
        return this.prisma.agentLog.findMany({
            where: {
                agentName,
                clientId,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
        });
    }
    /**
     * Get logs for a specific customer
     */
    async getCustomerLogs(customerId, clientId, limit = 50) {
        return this.prisma.agentLog.findMany({
            where: {
                customerId,
                clientId,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
        });
    }
    /**
     * Get logs for a conversation
     */
    async getConversationLogs(conversationId, clientId) {
        return this.prisma.agentLog.findMany({
            where: {
                conversationId,
                clientId,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
    }
    /**
     * Get agent analytics
     */
    async getAgentAnalytics(agentName, clientId, days = 7) {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const logs = await this.prisma.agentLog.findMany({
            where: {
                agentName,
                clientId,
                createdAt: {
                    gte: since,
                },
            },
        });
        const totalExecutions = logs.length;
        const successfulExecutions = logs.filter((log) => !log.error).length;
        const failedExecutions = logs.filter((log) => log.error).length;
        const avgExecutionTime = logs.reduce((sum, log) => sum + log.executionTimeMs, 0) / totalExecutions || 0;
        return {
            agentName,
            period: `Last ${days} days`,
            totalExecutions,
            successfulExecutions,
            failedExecutions,
            successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
            avgExecutionTimeMs: Math.round(avgExecutionTime),
        };
    }
    /**
     * Add log to in-memory cache
     */
    addToInMemoryCache(logEntry) {
        this.inMemoryLogs.push(logEntry);
        if (this.inMemoryLogs.length > this.maxInMemoryLogs) {
            this.inMemoryLogs.shift();
        }
    }
    /**
     * Clean up old logs (for GDPR compliance)
     */
    async cleanupOldLogs(daysToKeep = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const result = await this.prisma.agentLog.deleteMany({
            where: {
                createdAt: {
                    lt: cutoffDate,
                },
            },
        });
        return result.count;
    }
}
exports.AgentLogger = AgentLogger;
//# sourceMappingURL=Logger.js.map