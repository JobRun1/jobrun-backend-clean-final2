/**
 * Agent System Initialization
 * Registers all 21 JobRun agents with the Orchestrator
 */
import { PrismaClient } from '@prisma/client';
import { Orchestrator } from './engine/Orchestrator';
/**
 * Initialize and configure the agent system
 */
export declare function initializeAgentSystem(prisma: PrismaClient): Orchestrator;
/**
 * Get list of all registered agents with metadata
 */
export declare function getAgentManifest(orchestrator: Orchestrator): {
    name: string;
    tier: import("./base/types").AgentTier;
    triggers: import("./base/types").AgentTriggerType[];
    priority: number;
    enabled: boolean;
    model: "gpt-4" | "gpt-4o" | "gpt-4o-mini" | "gpt-3.5-turbo";
    confidenceThreshold: number;
}[];
export type { AgentContext, AgentOutput, AgentAction } from './base/types';
export type { OrchestrationResult } from './engine/Orchestrator';
export { Orchestrator } from './engine/Orchestrator';
//# sourceMappingURL=index.d.ts.map