"use strict";
/**
 * AI Admin Assistant Agent (ELITE TIER #19)
 * Handles system errors, misconfig, low balance alerts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIAdminAssistantAgent = void 0;
const BaseAgent_1 = require("../base/BaseAgent");
class AIAdminAssistantAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        const config = {
            name: 'AIAdminAssistant',
            tier: 'ELITE',
            triggers: ['SYSTEM_ERROR', 'PATTERN_DETECTED'],
            priority: 95,
            enabled: true,
            confidenceThreshold: 0.7,
            llmConfig: {
                model: 'gpt-4o',
                temperature: 0.5,
                maxTokens: 2048,
            },
        };
        super(config);
    }
    async execute(context) {
        throw new Error('Agent must be executed through AgentEngine');
    }
}
exports.AIAdminAssistantAgent = AIAdminAssistantAgent;
//# sourceMappingURL=AIAdminAssistantAgent.js.map