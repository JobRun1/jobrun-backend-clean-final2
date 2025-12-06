"use strict";
/**
 * Billing & Payment Nudger Agent (ELITE TIER #20)
 * Sends polite payment reminders
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingNudgerAgent = void 0;
const BaseAgent_1 = require("../base/BaseAgent");
class BillingNudgerAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        const config = {
            name: 'BillingNudger',
            tier: 'ELITE',
            triggers: ['OVERDUE_PAYMENT'],
            priority: 75,
            enabled: true,
            confidenceThreshold: 0.8,
            rateLimits: {
                cooldownMinutes: 4320, // 72 hours
            },
            llmConfig: {
                model: 'gpt-4o',
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
exports.BillingNudgerAgent = BillingNudgerAgent;
//# sourceMappingURL=BillingNudgerAgent.js.map