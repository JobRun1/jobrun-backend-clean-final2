/**
 * BaseAgent - Abstract base class for all JobRun agents
 * Enforces structure, safety, and output validation
 */
import type { AgentConfig, AgentContext, AgentOutput } from './types';
export declare abstract class BaseAgent {
    protected config: AgentConfig;
    constructor(config: AgentConfig);
    /**
     * Main execution method - must be implemented by each agent
     */
    abstract execute(context: AgentContext): Promise<AgentOutput>;
    /**
     * Check if this agent should handle the given context
     */
    canHandle(context: AgentContext): boolean;
    /**
     * Get agent configuration
     */
    getConfig(): AgentConfig;
    /**
     * Get agent name
     */
    getName(): string;
    /**
     * Get agent priority
     */
    getPriority(): number;
    /**
     * Validate agent output structure
     */
    protected validateOutput(output: AgentOutput): void;
    /**
     * Helper: Create a "low confidence" output that asks for clarification
     */
    protected createClarificationOutput(question: string, summary?: string): AgentOutput;
    /**
     * Helper: Create a "no action" output
     */
    protected createNoActionOutput(summary: string): AgentOutput;
    /**
     * Helper: Extract message content from context
     */
    protected getMessageContent(context: AgentContext): string;
    /**
     * Helper: Check if customer has opted out
     */
    protected hasOptedOut(message: string): boolean;
    /**
     * Helper: Get conversation history as string
     */
    protected getHistoryString(context: AgentContext): string;
}
//# sourceMappingURL=BaseAgent.d.ts.map