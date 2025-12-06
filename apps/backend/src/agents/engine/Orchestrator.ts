/**
 * Orchestrator - Top-level agent orchestration and execution
 */

import { PrismaClient } from '@prisma/client';
import { AgentRegistry } from './AgentRegistry';
import { AgentEngine } from './AgentEngine';
import { RateLimiter } from './RateLimiter';
import { Safety } from './Safety';
import { AgentLogger } from './Logger';
import { ActionExecutor } from './ActionExecutor';
import type {
  AgentContext,
  AgentExecutionResult,
  AgentOutput,
} from '../base/types';

export interface OrchestrationResult {
  success: boolean;
  agentName?: string;
  output?: AgentOutput;
  actionsExecuted?: number;
  error?: string;
  executionTimeMs: number;
}

export class Orchestrator {
  private registry: AgentRegistry;
  private engine: AgentEngine;
  private rateLimiter: RateLimiter;
  private safety: Safety;
  private logger: AgentLogger;
  private actionExecutor: ActionExecutor;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.registry = new AgentRegistry();
    this.engine = new AgentEngine();
    this.rateLimiter = new RateLimiter();
    this.safety = new Safety();
    this.logger = new AgentLogger(prisma);
    this.actionExecutor = new ActionExecutor(prisma);
  }

  /**
   * Get the agent registry for registration
   */
  getRegistry(): AgentRegistry {
    return this.registry;
  }

  /**
   * Process incoming context and orchestrate agents
   */
  async process(context: AgentContext): Promise<OrchestrationResult> {
    const startTime = Date.now();

    try {
      // Find suitable agents
      const candidates = this.registry.findAgentsForContext(context);

      if (candidates.length === 0) {
        return {
          success: false,
          error: 'No agents found for this context',
          executionTimeMs: Date.now() - startTime,
        };
      }

      // Try each candidate in priority order
      for (const agent of candidates) {
        const agentName = agent.getName();
        const config = agent.getConfig();

        // Check rate limits
        const rateLimitCheck = await this.rateLimiter.checkRateLimit(
          agentName,
          context.clientId,
          config,
          context.customerId
        );

        if (!rateLimitCheck.allowed) {
          console.log(`Agent ${agentName} rate limited: ${rateLimitCheck.reason}`);
          continue; // Try next agent
        }

        // Execute agent
        const result = await this.engine.executeAgent(agent, context);

        // Log execution
        await this.logger.logExecution(agentName, context, result);

        if (!result.success || !result.output) {
          console.log(`Agent ${agentName} failed: ${result.error}`);
          continue; // Try next agent
        }

        // Check safety
        const safetyCheck = await this.safety.checkOutput(
          result.output,
          context,
          agentName
        );

        if (!safetyCheck.safe) {
          console.log(
            `Agent ${agentName} safety check failed:`,
            safetyCheck.violations
          );
          continue; // Try next agent
        }

        // Log warnings
        if (safetyCheck.warnings.length > 0) {
          console.warn(`Agent ${agentName} warnings:`, safetyCheck.warnings);
        }

        // Check confidence threshold
        if (result.output.confidence < config.confidenceThreshold) {
          console.log(
            `Agent ${agentName} confidence too low: ${result.output.confidence}`
          );
          // Still execute if it's asking for clarification
          if (
            result.output.actions.length === 1 &&
            result.output.actions[0].type === 'ASK_FOR_DETAILS'
          ) {
            // Allow this action
          } else {
            continue; // Try next agent
          }
        }

        // Execute actions
        const actionResults = await this.actionExecutor.executeActions(
          result.output.actions,
          context
        );

        const successfulActions = actionResults.filter((r) => r.success).length;

        // Record execution
        this.rateLimiter.recordExecution(
          agentName,
          context.clientId,
          context.customerId
        );

        // Mark message as processed
        this.safety.markProcessed(context);

        return {
          success: true,
          agentName,
          output: result.output,
          actionsExecuted: successfulActions,
          executionTimeMs: Date.now() - startTime,
        };
      }

      // No agent succeeded
      return {
        success: false,
        error: 'All candidate agents failed',
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Orchestration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Process with specific agent (bypass orchestration)
   */
  async processWithAgent(
    agentName: string,
    context: AgentContext
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();

    const agent = this.registry.getAgent(agentName);
    if (!agent) {
      return {
        success: false,
        error: `Agent ${agentName} not found`,
        executionTimeMs: Date.now() - startTime,
      };
    }

    const result = await this.engine.executeAgent(agent, context);
    await this.logger.logExecution(agentName, context, result);

    if (!result.success || !result.output) {
      return {
        success: false,
        error: result.error,
        executionTimeMs: Date.now() - startTime,
      };
    }

    const actionResults = await this.actionExecutor.executeActions(
      result.output.actions,
      context
    );

    const successfulActions = actionResults.filter((r) => r.success).length;

    return {
      success: true,
      agentName,
      output: result.output,
      actionsExecuted: successfulActions,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Cleanup background tasks
   */
  async cleanup(): Promise<void> {
    this.rateLimiter.cleanup();
    this.safety.cleanup();
    await this.logger.cleanupOldLogs();
  }
}
