"use strict";
/**
 * Summariser Agent (CORE TIER #3)
 * Summarizes conversations for CRM
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummariserAgent = void 0;
const BaseAgent_1 = require("../base/BaseAgent");
class SummariserAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        const config = {
            name: 'Summariser',
            tier: 'CORE',
            triggers: ['CONVERSATION_CLOSE', 'BOOKING_REQUEST'],
            priority: 50,
            enabled: true,
            confidenceThreshold: 0.5,
            llmConfig: {
                model: 'gpt-4o-mini',
                temperature: 0.5,
                maxTokens: 512,
            },
        };
        super(config);
    }
    async execute(context) {
        throw new Error('Agent must be executed through AgentEngine');
    }
}
exports.SummariserAgent = SummariserAgent;
//# sourceMappingURL=SummariserAgent.js.map