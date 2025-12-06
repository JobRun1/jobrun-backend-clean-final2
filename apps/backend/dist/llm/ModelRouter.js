"use strict";
/**
 * ModelRouter - Selects the best LLM model for each agent (OpenAI only)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelRouter = void 0;
class ModelRouter {
    /**
     * Get recommended model for an agent based on complexity and tier
     */
    getModelForAgent(agentName, tier) {
        // Elite tier agents get the most powerful models
        if (tier === 'ELITE') {
            return this.getEliteModel(agentName);
        }
        // Core tier agents need reliability and speed
        if (tier === 'CORE') {
            return this.getCoreModel(agentName);
        }
        // Automation tier balanced approach
        if (tier === 'AUTOMATION') {
            return this.getAutomationModel(agentName);
        }
        // Admin tier
        return 'gpt-4o';
    }
    /**
     * Get model for Elite tier agents
     */
    getEliteModel(agentName) {
        const complexAgents = ['RevenueMaximiser', 'AIAdminAssistant'];
        if (complexAgents.includes(agentName)) {
            return 'gpt-4o'; // Most powerful for complex reasoning
        }
        return 'gpt-4o'; // Good balance for most elite features
    }
    /**
     * Get model for Core tier agents
     */
    getCoreModel(agentName) {
        const simpleAgents = ['DataCleanup', 'DataValidator'];
        if (simpleAgents.includes(agentName)) {
            return 'gpt-4o-mini'; // Fast and efficient for simple tasks
        }
        // Lead handling and booking need good reasoning
        if (agentName === 'LeadHandling' || agentName === 'BookingCoordinator') {
            return 'gpt-4o';
        }
        return 'gpt-4o-mini'; // Good default for core features
    }
    /**
     * Get model for Automation tier agents
     */
    getAutomationModel(agentName) {
        const analyticalAgents = [
            'Insights',
            'PredictiveLoad',
            'TemplateOptimiser',
        ];
        if (analyticalAgents.includes(agentName)) {
            return 'gpt-4o'; // Better for analysis
        }
        const simpleAgents = [
            'SmartFollowUp',
            'FAQResponder',
            'DailyBriefing',
        ];
        if (simpleAgents.includes(agentName)) {
            return 'gpt-4o-mini'; // Fast for simple automations
        }
        return 'gpt-4o-mini'; // Good default
    }
    /**
     * Get fallback model if primary fails
     */
    getFallbackModel(primaryModel) {
        const fallbackMap = {
            'gpt-4': 'gpt-4o',
            'gpt-4o': 'gpt-4o-mini',
            'gpt-4o-mini': 'gpt-3.5-turbo',
            'gpt-3.5-turbo': 'gpt-4o-mini',
        };
        return fallbackMap[primaryModel] || 'gpt-4o-mini';
    }
    /**
     * Estimate cost for model usage
     */
    estimateCost(model, inputTokens, outputTokens) {
        // Approximate costs per 1M tokens (as of 2024)
        const pricing = {
            'gpt-4': { input: 30, output: 60 },
            'gpt-4o': { input: 5, output: 15 },
            'gpt-4o-mini': { input: 0.15, output: 0.6 },
            'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
        };
        const modelPricing = pricing[model];
        const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
        const outputCost = (outputTokens / 1_000_000) * modelPricing.output;
        return inputCost + outputCost;
    }
}
exports.ModelRouter = ModelRouter;
//# sourceMappingURL=ModelRouter.js.map