"use strict";
/**
 * AgentRegistry - Manages registration and lookup of all agents
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRegistry = void 0;
class AgentRegistry {
    agents = new Map();
    /**
     * Register an agent
     */
    register(agent) {
        const name = agent.getName();
        if (this.agents.has(name)) {
            throw new Error(`Agent ${name} is already registered`);
        }
        this.agents.set(name, agent);
    }
    /**
     * Get agent by name
     */
    getAgent(name) {
        return this.agents.get(name);
    }
    /**
     * Get all agents
     */
    getAllAgents() {
        return Array.from(this.agents.values());
    }
    /**
     * Find agents that can handle the given context
     * Returns agents sorted by priority (highest first)
     */
    findAgentsForContext(context) {
        const candidates = Array.from(this.agents.values()).filter((agent) => agent.canHandle(context));
        // Sort by priority (highest first)
        return candidates.sort((a, b) => b.getPriority() - a.getPriority());
    }
    /**
     * Find agents by trigger type
     */
    findAgentsByTrigger(trigger) {
        return Array.from(this.agents.values()).filter((agent) => agent.getConfig().triggers.includes(trigger));
    }
    /**
     * Get agent count
     */
    getAgentCount() {
        return this.agents.size;
    }
    /**
     * Check if agent exists
     */
    hasAgent(name) {
        return this.agents.has(name);
    }
    /**
     * Unregister agent (for testing)
     */
    unregister(name) {
        return this.agents.delete(name);
    }
    /**
     * Clear all agents (for testing)
     */
    clear() {
        this.agents.clear();
    }
}
exports.AgentRegistry = AgentRegistry;
//# sourceMappingURL=AgentRegistry.js.map