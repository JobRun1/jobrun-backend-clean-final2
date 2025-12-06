"use strict";
/**
 * Insights Agent (AUTOMATION TIER #6)
 * Generates weekly business insights
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightsAgent = void 0;
const BaseAgent_1 = require("../base/BaseAgent");
class InsightsAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        const config = {
            name: 'Insights',
            tier: 'AUTOMATION',
            triggers: ['WEEKLY_CRON'],
            priority: 70,
            enabled: true,
            confidenceThreshold: 0.6,
            rateLimits: {
                maxExecutionsPerDay: 1,
            },
            llmConfig: {
                model: 'gpt-4o',
                temperature: 0.6,
                maxTokens: 2048,
            },
        };
        super(config);
    }
    async execute(context) {
        throw new Error('Agent must be executed through AgentEngine');
    }
}
exports.InsightsAgent = InsightsAgent;
//# sourceMappingURL=InsightsAgent.js.map