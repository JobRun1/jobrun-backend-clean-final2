"use strict";
/**
 * Customer Categoriser Agent (AUTOMATION TIER #8)
 * Tags customers as VIP, repeat, dormant, etc.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerCategoriserAgent = void 0;
const BaseAgent_1 = require("../base/BaseAgent");
class CustomerCategoriserAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        const config = {
            name: 'CustomerCategoriser',
            tier: 'AUTOMATION',
            triggers: ['NEW_CUSTOMER', 'BOOKING_REQUEST', 'PATTERN_DETECTED'],
            priority: 45,
            enabled: true,
            confidenceThreshold: 0.6,
            llmConfig: {
                model: 'gpt-4o-mini',
                temperature: 0.4,
                maxTokens: 512,
            },
        };
        super(config);
    }
    async execute(context) {
        throw new Error('Agent must be executed through AgentEngine');
    }
}
exports.CustomerCategoriserAgent = CustomerCategoriserAgent;
//# sourceMappingURL=CustomerCategoriserAgent.js.map