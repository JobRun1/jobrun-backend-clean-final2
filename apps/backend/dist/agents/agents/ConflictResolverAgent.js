"use strict";
/**
 * Conflict Resolver Agent (AUTOMATION TIER #11)
 * Detects and resolves calendar conflicts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictResolverAgent = void 0;
const BaseAgent_1 = require("../base/BaseAgent");
class ConflictResolverAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        const config = {
            name: 'ConflictResolver',
            tier: 'AUTOMATION',
            triggers: ['CALENDAR_CONFLICT', 'BOOKING_REQUEST'],
            priority: 85,
            enabled: true,
            confidenceThreshold: 0.7,
            llmConfig: {
                model: 'gpt-4o',
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
exports.ConflictResolverAgent = ConflictResolverAgent;
//# sourceMappingURL=ConflictResolverAgent.js.map