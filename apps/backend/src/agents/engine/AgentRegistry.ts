/**
 * AgentRegistry - Manages registration and lookup of all agents
 */

import type { BaseAgent } from '../base/BaseAgent';
import type { AgentContext, AgentTriggerType } from '../base/types';

export class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map();

  /**
   * Register an agent
   */
  register(agent: BaseAgent): void {
    const name = agent.getName();
    if (this.agents.has(name)) {
      throw new Error(`Agent ${name} is already registered`);
    }
    this.agents.set(name, agent);
  }

  /**
   * Get agent by name
   */
  getAgent(name: string): BaseAgent | undefined {
    return this.agents.get(name);
  }

  /**
   * Get all agents
   */
  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Find agents that can handle the given context
   * Returns agents sorted by priority (highest first)
   */
  findAgentsForContext(context: AgentContext): BaseAgent[] {
    const candidates = Array.from(this.agents.values()).filter((agent) =>
      agent.canHandle(context)
    );

    // Sort by priority (highest first)
    return candidates.sort((a, b) => b.getPriority() - a.getPriority());
  }

  /**
   * Find agents by trigger type
   */
  findAgentsByTrigger(trigger: AgentTriggerType): BaseAgent[] {
    return Array.from(this.agents.values()).filter((agent) =>
      agent.getConfig().triggers.includes(trigger)
    );
  }

  /**
   * Get agent count
   */
  getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Check if agent exists
   */
  hasAgent(name: string): boolean {
    return this.agents.has(name);
  }

  /**
   * Unregister agent (for testing)
   */
  unregister(name: string): boolean {
    return this.agents.delete(name);
  }

  /**
   * Clear all agents (for testing)
   */
  clear(): void {
    this.agents.clear();
  }
}
