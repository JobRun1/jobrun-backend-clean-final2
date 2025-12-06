/**
 * SafetyValidator - Pre-validates prompts and post-validates outputs
 */
import type { AgentContext } from '../agents/base/types';
export interface PromptSafetyCheck {
    safe: boolean;
    issues: string[];
    warnings: string[];
}
export declare class SafetyValidator {
    /**
     * Validate prompt before sending to LLM
     */
    validatePrompt(systemPrompt: string, userPrompt: string, context: AgentContext): PromptSafetyCheck;
    /**
     * Validate LLM output before parsing
     */
    validateOutput(llmOutput: string): PromptSafetyCheck;
    /**
     * Detect sensitive data patterns
     */
    private containsSensitiveData;
    /**
     * Detect prompt injection attempts
     */
    private detectInjection;
    /**
     * Detect system instructions in user input
     */
    private containsSystemInstructions;
    /**
     * Detect refusal patterns
     */
    private isRefusal;
    /**
     * Sanitize user input before including in prompts
     */
    sanitizeUserInput(input: string): string;
}
//# sourceMappingURL=SafetyValidator.d.ts.map