/**
 * AgentRegistry - Manages registration and lookup of all agents
 */
import type { BaseAgent } from '../base/BaseAgent';
import type { AgentContext, AgentTriggerType } from '../base/types';
export declare class AgentRegistry {
    private agents;
    /**
     * Register an agent
     */
    register(agent: BaseAgent): void;
    /**
     * Get agent by name
     */
    getAgent(name: string): BaseAgent | undefined;
    /**
     * Get all agents
     */
    getAllAgents(): BaseAgent[];
    /**
     * Find agents that can handle the given context
     * Returns agents sorted by priority (highest first)
     */
    findAgentsForContext(context: AgentContext): BaseAgent[];
    /**
     * Find agents by trigger type
     */
    findAgentsByTrigger(trigger: AgentTriggerType): BaseAgent[];
    /**
     * Get agent count
     */
    getAgentCount(): number;
    /**
     * Check if agent exists
     */
    hasAgent(name: string): boolean;
    /**
     * Unregister agent (for testing)
     */
    unregister(name: string): boolean;
    /**
     * Clear all agents (for testing)
     */
    clear(): void;
}
//# sourceMappingURL=AgentRegistry.d.ts.map