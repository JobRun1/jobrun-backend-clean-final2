"use strict";
/**
 * Smart Follow-Up Agent (AUTOMATION TIER #13)
 * Sends gentle follow-ups when no reply after timeout
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartFollowUpAgent = void 0;
const BaseAgent_1 = require("../base/BaseAgent");
class SmartFollowUpAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        const config = {
            name: 'SmartFollowUp',
            tier: 'AUTOMATION',
            triggers: ['NO_REPLY_TIMEOUT'],
            priority: 55,
            enabled: true,
            confidenceThreshold: 0.6,
            rateLimits: {
                maxExecutionsPerDay: 3,
                cooldownMinutes: 360, // 6 hours
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
exports.SmartFollowUpAgent = SmartFollowUpAgent;
//# sourceMappingURL=SmartFollowUpAgent.js.map