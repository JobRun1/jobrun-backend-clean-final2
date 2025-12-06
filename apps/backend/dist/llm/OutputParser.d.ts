/**
 * OutputParser - Validates and parses LLM outputs into structured AgentOutput
 */
import type { AgentOutput } from '../agents/base/types';
export declare class OutputParser {
    /**
     * Parse LLM response into AgentOutput
     */
    parse(llmResponse: string): AgentOutput;
    /**
     * Extract JSON from LLM response (handles markdown code blocks, etc.)
     */
    private extractJSON;
    /**
     * Validate output structure
     */
    private validateOutput;
    /**
     * Parse with retry - attempts multiple parsing strategies
     */
    parseWithRetry(llmResponse: string, maxAttempts?: number): AgentOutput;
    /**
     * Clean response with different strategies based on attempt number
     */
    private cleanResponse;
}
//# sourceMappingURL=OutputParser.d.ts.map