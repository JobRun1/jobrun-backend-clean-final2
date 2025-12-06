"use strict";
/**
 * Booking Coordinator Agent (CORE TIER #2)
 * Handles booking requests, changes, and rescheduling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingCoordinatorAgent = void 0;
const BaseAgent_1 = require("../base/BaseAgent");
class BookingCoordinatorAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        const config = {
            name: 'BookingCoordinator',
            tier: 'CORE',
            triggers: ['BOOKING_REQUEST', 'INBOUND_SMS'],
            priority: 95,
            enabled: true,
            confidenceThreshold: 0.7,
            llmConfig: {
                model: 'gpt-4o',
                temperature: 0.6,
                maxTokens: 1536,
            },
        };
        super(config);
    }
    async execute(context) {
        throw new Error('Agent must be executed through AgentEngine');
    }
}
exports.BookingCoordinatorAgent = BookingCoordinatorAgent;
//# sourceMappingURL=BookingCoordinatorAgent.js.map