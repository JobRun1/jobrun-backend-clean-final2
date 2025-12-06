/**
 * LLMClient - OpenAI-only LLM client
 */
export type LLMProvider = 'openai';
export type LLMModel = 'gpt-4' | 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo';
export interface LLMRequest {
    model: LLMModel;
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
}
export interface LLMResponse {
    content: string;
    usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    model: string;
    provider: LLMProvider;
}
export declare class LLMClient {
    private openai;
    constructor();
    /**
     * Generate completion with OpenAI
     */
    generate(request: LLMRequest): Promise<LLMResponse>;
    /**
     * Generate with OpenAI
     */
    private generateOpenAI;
}
/**
 * Simple helper function for quick AI completions
 */
export declare function runModel(prompt: string): Promise<string>;
//# sourceMappingURL=LLMClient.d.ts.map