/**
 * ModelRouter - Selects the best LLM model for each agent (OpenAI only)
 */
import type { LLMModel } from './LLMClient';
export declare class ModelRouter {
    /**
     * Get recommended model for an agent based on complexity and tier
     */
    getModelForAgent(agentName: string, tier: 'CORE' | 'AUTOMATION' | 'ELITE' | 'ADMIN'): LLMModel;
    /**
     * Get model for Elite tier agents
     */
    private getEliteModel;
    /**
     * Get model for Core tier agents
     */
    private getCoreModel;
    /**
     * Get model for Automation tier agents
     */
    private getAutomationModel;
    /**
     * Get fallback model if primary fails
     */
    getFallbackModel(primaryModel: LLMModel): LLMModel;
    /**
     * Estimate cost for model usage
     */
    estimateCost(model: LLMModel, inputTokens: number, outputTokens: number): number;
}
//# sourceMappingURL=ModelRouter.d.ts.map