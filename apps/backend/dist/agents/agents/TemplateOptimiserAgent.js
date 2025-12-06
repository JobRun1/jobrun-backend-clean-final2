"use strict";
/**
 * Template Optimiser Agent (AUTOMATION TIER #9)
 * Analyzes response patterns and suggests template improvements
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateOptimiserAgent = void 0;
const BaseAgent_1 = require("../base/BaseAgent");
class TemplateOptimiserAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        const config = {
            name: 'TemplateOptimiser',
            tier: 'AUTOMATION',
            triggers: ['WEEKLY_CRON', 'PATTERN_DETECTED'],
            priority: 50,
            enabled: true,
            confidenceThreshold: 0.65,
            rateLimits: {
                maxExecutionsPerDay: 1,
            },
            llmConfig: {
                model: 'gpt-4o',
                temperature: 0.7,
                maxTokens: 1536,
            },
        };
        super(config);
    }
    async execute(context) {
        throw new Error('Agent must be executed through AgentEngine');
    }
}
exports.TemplateOptimiserAgent = TemplateOptimiserAgent;
//# sourceMappingURL=TemplateOptimiserAgent.js.map