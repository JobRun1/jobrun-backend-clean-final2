"use strict";
/**
 * Review Manager Agent (AUTOMATION TIER #15)
 * Requests reviews after job completion
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewManagerAgent = void 0;
const BaseAgent_1 = require("../base/BaseAgent");
class ReviewManagerAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        const config = {
            name: 'ReviewManager',
            tier: 'AUTOMATION',
            triggers: ['JOB_COMPLETED'],
            priority: 50,
            enabled: true,
            confidenceThreshold: 0.7,
            rateLimits: {
                cooldownMinutes: 10080, // 7 days
            },
            llmConfig: {
                model: 'gpt-4o-mini',
                temperature: 0.7,
                maxTokens: 512,
            },
        };
        super(config);
    }
    async execute(context) {
        throw new Error('Agent must be executed through AgentEngine');
    }
}
exports.ReviewManagerAgent = ReviewManagerAgent;
//# sourceMappingURL=ReviewManagerAgent.js.map