/**
 * Orchestrator - Top-level agent orchestration and execution
 */
import { PrismaClient } from '@prisma/client';
import { AgentRegistry } from './AgentRegistry';
import type { AgentContext, AgentOutput } from '../base/types';
export interface OrchestrationResult {
    success: boolean;
    agentName?: string;
    output?: AgentOutput;
    actionsExecuted?: number;
    error?: string;
    executionTimeMs: number;
}
export declare class Orchestrator {
    private registry;
    private engine;
    private rateLimiter;
    private safety;
    private logger;
    private actionExecutor;
    private prisma;
    constructor(prisma: PrismaClient);
    /**
     * Get the agent registry for registration
     */
    getRegistry(): AgentRegistry;
    /**
     * Process incoming context and orchestrate agents
     */
    process(context: AgentContext): Promise<OrchestrationResult>;
    /**
     * Process with specific agent (bypass orchestration)
     */
    processWithAgent(agentName: string, context: AgentContext): Promise<OrchestrationResult>;
    /**
     * Cleanup background tasks
     */
    cleanup(): Promise<void>;
}
//# sourceMappingURL=Orchestrator.d.ts.map