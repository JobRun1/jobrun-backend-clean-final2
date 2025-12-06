"use strict";
/**
 * Auto Reschedule Agent (AUTOMATION TIER #10)
 * Handles rescheduling requests automatically
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoRescheduleAgent = void 0;
const BaseAgent_1 = require("../base/BaseAgent");
class AutoRescheduleAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        const config = {
            name: 'AutoReschedule',
            tier: 'AUTOMATION',
            triggers: ['INBOUND_SMS', 'BOOKING_REQUEST'],
            priority: 80,
            enabled: true,
            confidenceThreshold: 0.75,
            llmConfig: {
                model: 'gpt-4o',
                temperature: 0.6,
                maxTokens: 1024,
            },
        };
        super(config);
    }
    async execute(context) {
        throw new Error('Agent must be executed through AgentEngine');
    }
}
exports.AutoRescheduleAgent = AutoRescheduleAgent;
//# sourceMappingURL=AutoRescheduleAgent.js.map