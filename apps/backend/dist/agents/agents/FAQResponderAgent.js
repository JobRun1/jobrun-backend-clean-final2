"use strict";
/**
 * FAQ Responder Agent (ELITE TIER #17)
 * Quick answers for common questions (price, area, availability)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FAQResponderAgent = void 0;
const BaseAgent_1 = require("../base/BaseAgent");
class FAQResponderAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        const config = {
            name: 'FAQResponder',
            tier: 'ELITE',
            triggers: ['INBOUND_SMS'],
            priority: 90,
            enabled: true,
            confidenceThreshold: 0.75,
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
exports.FAQResponderAgent = FAQResponderAgent;
//# sourceMappingURL=FAQResponderAgent.js.map