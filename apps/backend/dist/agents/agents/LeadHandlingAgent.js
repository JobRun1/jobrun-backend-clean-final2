"use strict";
/**
 * Lead Handling Agent (CORE TIER #1)
 * Handles inbound SMS and missed calls, qualifies leads
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadHandlingAgent = void 0;
const BaseAgent_1 = require("../base/BaseAgent");
class LeadHandlingAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        const config = {
            name: 'LeadHandling',
            tier: 'CORE',
            triggers: ['INBOUND_SMS', 'INBOUND_CALL'],
            priority: 100, // Highest priority for first contact
            enabled: true,
            confidenceThreshold: 0.6,
            llmConfig: {
                model: 'gpt-4o',
                temperature: 0.7,
                maxTokens: 1024,
            },
        };
        super(config);
    }
    async execute(context) {
        // This is a placeholder - actual execution happens through AgentEngine + LLM
        // The LLM will use the prompt from prompts/LeadHandling.txt
        throw new Error('Agent must be executed through AgentEngine');
    }
}
exports.LeadHandlingAgent = LeadHandlingAgent;
//# sourceMappingURL=LeadHandlingAgent.js.map