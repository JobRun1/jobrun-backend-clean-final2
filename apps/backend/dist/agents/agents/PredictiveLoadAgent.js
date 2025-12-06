"use strict";
/**
 * Predictive Load Agent (AUTOMATION TIER #14)
 * Predicts busy/quiet weeks based on patterns
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictiveLoadAgent = void 0;
const BaseAgent_1 = require("../base/BaseAgent");
class PredictiveLoadAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        const config = {
            name: 'PredictiveLoad',
            tier: 'AUTOMATION',
            triggers: ['WEEKLY_CRON'],
            priority: 60,
            enabled: true,
            confidenceThreshold: 0.65,
            rateLimits: {
                maxExecutionsPerDay: 1,
            },
            llmConfig: {
                model: 'gpt-4o',
                temperature: 0.5,
                maxTokens: 1536,
            },
        };
        super(config);
    }
    async execute(context) {
        throw new Error('Agent must be executed through AgentEngine');
    }
}
exports.PredictiveLoadAgent = PredictiveLoadAgent;
//# sourceMappingURL=PredictiveLoadAgent.js.map