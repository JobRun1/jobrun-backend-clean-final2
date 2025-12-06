"use strict";
/**
 * Daily Briefing Agent (AUTOMATION TIER #12)
 * Sends morning briefing with today's schedule
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyBriefingAgent = void 0;
const BaseAgent_1 = require("../base/BaseAgent");
class DailyBriefingAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        const config = {
            name: 'DailyBriefing',
            tier: 'AUTOMATION',
            triggers: ['DAILY_CRON'],
            priority: 65,
            enabled: true,
            confidenceThreshold: 0.6,
            rateLimits: {
                maxExecutionsPerDay: 1,
            },
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
exports.DailyBriefingAgent = DailyBriefingAgent;
//# sourceMappingURL=DailyBriefingAgent.js.map