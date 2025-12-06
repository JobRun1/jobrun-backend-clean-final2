"use strict";
/**
 * Availability Manager Agent (AUTOMATION TIER #7)
 * Suggests calendar blockouts based on patterns
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityManagerAgent = void 0;
const BaseAgent_1 = require("../base/BaseAgent");
class AvailabilityManagerAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        const config = {
            name: 'AvailabilityManager',
            tier: 'AUTOMATION',
            triggers: ['WEEKLY_CRON', 'PATTERN_DETECTED'],
            priority: 55,
            enabled: true,
            confidenceThreshold: 0.65,
            llmConfig: {
                model: 'gpt-4o-mini',
                temperature: 0.5,
                maxTokens: 1024,
            },
        };
        super(config);
    }
    async execute(context) {
        throw new Error('Agent must be executed through AgentEngine');
    }
}
exports.AvailabilityManagerAgent = AvailabilityManagerAgent;
//# sourceMappingURL=AvailabilityManagerAgent.js.map