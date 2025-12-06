"use strict";
/**
 * Demo Mode Agent (ADMIN TIER #21)
 * Creates simulated bookings, messages, customers for demos
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoModeAgent = void 0;
const BaseAgent_1 = require("../base/BaseAgent");
class DemoModeAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        const config = {
            name: 'DemoMode',
            tier: 'ADMIN',
            triggers: ['ADMIN_ACTIVATION'],
            priority: 100,
            enabled: true,
            confidenceThreshold: 0.9,
            llmConfig: {
                model: 'gpt-4o',
                temperature: 0.8,
                maxTokens: 2048,
            },
        };
        super(config);
    }
    async execute(context) {
        throw new Error('Agent must be executed through AgentEngine');
    }
}
exports.DemoModeAgent = DemoModeAgent;
//# sourceMappingURL=DemoModeAgent.js.map