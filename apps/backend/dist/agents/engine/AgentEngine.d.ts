/**
 * AgentEngine - Core engine for executing individual agents with LLM
 */
import { BaseAgent } from '../base/BaseAgent';
import type { AgentContext, AgentExecutionResult } from '../base/types';
export declare class AgentEngine {
    private llmClient;
    private promptBuilder;
    private outputParser;
    private safetyValidator;
    private modelRouter;
    constructor();
    /**
     * Execute an agent with LLM
     */
    executeAgent(agent: BaseAgent, context: AgentContext): Promise<AgentExecutionResult>;
    /**
     * Validate agent output meets minimum requirements
     */
    private validateAgentOutput;
}
//# sourceMappingURL=AgentEngine.d.ts.map