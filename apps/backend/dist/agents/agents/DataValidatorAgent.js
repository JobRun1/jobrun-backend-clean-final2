"use strict";
/**
 * Data Validator Agent (CORE TIER #5)
 * Health-checks business setup and settings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataValidatorAgent = void 0;
const BaseAgent_1 = require("../base/BaseAgent");
class DataValidatorAgent extends BaseAgent_1.BaseAgent {
    constructor() {
        const config = {
            name: 'DataValidator',
            tier: 'CORE',
            triggers: ['SETTINGS_CHANGED', 'NEW_CUSTOMER'],
            priority: 60,
            enabled: true,
            confidenceThreshold: 0.7,
            llmConfig: {
                model: 'gpt-4o-mini',
                temperature: 0.3,
                maxTokens: 512,
            },
        };
        super(config);
    }
    async execute(context) {
        throw new Error('Agent must be executed through AgentEngine');
    }
}
exports.DataValidatorAgent = DataValidatorAgent;
//# sourceMappingURL=DataValidatorAgent.js.map