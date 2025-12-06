/**
 * Logger - Records agent executions for analytics and debugging
 */

import { PrismaClient } from '@prisma/client';
import type {
  AgentContext,
  AgentOutput,
  AgentExecutionResult,
  AgentLogEntry,
} from '../base/types';

export class AgentLogger {
  private prisma: PrismaClient;
  private inMemoryLogs: AgentLogEntry[] = [];
  private maxInMemoryLogs = 1000;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Log agent execution
   */
  async logExecution(
    agentName: string,
    context: AgentContext,
    result: AgentExecutionResult
  ): Promise<void> {
    try {
      const logEntry = await this.prisma.agentLog.create({
        data: {
          agentName,
          clientId: context.clientId,
          customerId: context.customerId,
          conversationId: context.conversationId,
          trigger: context.trigger,
          input: context.input as any,
          output: result.output ? (result.output as any) : null,
          error: result.error,
          executionTimeMs: result.executionTimeMs,
          createdAt: result.timestamp,
        },
      });

      // Also keep in memory for quick access
      this.addToInMemoryCache(logEntry);
    } catch (error) {
      console.error('Failed to log agent execution:', error);
      // Don't throw - logging failures shouldn't break agent execution
    }
  }

  /**
   * Get recent logs for an agent
   */
  async getRecentLogs(
    agentName: string,
    clientId: string,
    limit: number = 50
  ): Promise<AgentLogEntry[]> {
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
  async getCustomerLogs(
    customerId: string,
    clientId: string,
    limit: number = 50
  ): Promise<AgentLogEntry[]> {
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
  async getConversationLogs(
    conversationId: string,
    clientId: string
  ): Promise<AgentLogEntry[]> {
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
  async getAgentAnalytics(agentName: string, clientId: string, days: number = 7) {
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
    const avgExecutionTime =
      logs.reduce((sum, log) => sum + log.executionTimeMs, 0) / totalExecutions || 0;

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
  private addToInMemoryCache(logEntry: AgentLogEntry): void {
    this.inMemoryLogs.push(logEntry);
    if (this.inMemoryLogs.length > this.maxInMemoryLogs) {
      this.inMemoryLogs.shift();
    }
  }

  /**
   * Clean up old logs (for GDPR compliance)
   */
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
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
