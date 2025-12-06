/**
 * PromptBuilder - Constructs prompts for agents with context injection
 */
import type { AgentContext } from '../agents/base/types';
export declare class PromptBuilder {
    private promptsDir;
    constructor(promptsDir?: string);
    /**
     * Build complete prompt for an agent
     */
    buildPrompt(agentName: string, context: AgentContext, additionalInstructions?: string): {
        systemPrompt: string;
        userPrompt: string;
    };
    /**
     * Load agent prompt template from file
     */
    private loadAgentPrompt;
    /**
     * Build system prompt with context
     */
    private buildSystemPrompt;
    /**
     * Build user prompt with context
     */
    private buildUserPrompt;
    /**
     * Get default prompt for agents without prompt files
     */
    private getDefaultPrompt;
}
//# sourceMappingURL=PromptBuilder.d.ts.map