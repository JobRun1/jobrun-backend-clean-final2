"use strict";
/**
 * Chat Assistant Agent (ELITE TIER #16)
 * Answers client questions about the system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatAssistantAgent = void 0;
const BaseAgent_1 = require("../base/BaseAgent");
class ChatAssistantAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        const config = {
            name: 'ChatAssistant',
            tier: 'ELITE',
            triggers: ['INBOUND_SMS', 'PATTERN_DETECTED'],
            priority: 70,
            enabled: true,
            confidenceThreshold: 0.65,
            llmConfig: {
                model: 'gpt-4o',
                temperature: 0.7,
                maxTokens: 1536,
            },
        };
        super(config);
    }
    async execute(context) {
        throw new Error('Agent must be executed through AgentEngine');
    }
}
exports.ChatAssistantAgent = ChatAssistantAgent;
//# sourceMappingURL=ChatAssistantAgent.js.map