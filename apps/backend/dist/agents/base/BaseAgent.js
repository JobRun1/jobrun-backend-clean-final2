"use strict";
/**
 * BaseAgent - Abstract base class for all JobRun agents
 * Enforces structure, safety, and output validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAgent = void 0;
class BaseAgent {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Check if this agent should handle the given context
     */
    canHandle(context) {
        if (!this.config.enabled) {
            return false;
        }
        return this.config.triggers.includes(context.trigger);
    }
    /**
     * Get agent configuration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Get agent name
     */
    getName() {
        return this.config.name;
    }
    /**
     * Get agent priority
     */
    getPriority() {
        return this.config.priority;
    }
    /**
     * Validate agent output structure
     */
    validateOutput(output) {
        if (!output.actions || !Array.isArray(output.actions)) {
            throw new Error('Agent output must include actions array');
        }
        if (typeof output.summary !== 'string') {
            throw new Error('Agent output must include summary string');
        }
        if (typeof output.confidence !== 'number' ||
            output.confidence < 0 ||
            output.confidence > 1) {
            throw new Error('Agent output confidence must be between 0 and 1');
        }
        if (typeof output.followUpNeeded !== 'boolean') {
            throw new Error('Agent output must include followUpNeeded boolean');
        }
        // Validate each action
        output.actions.forEach((action, index) => {
            if (!action.type) {
                throw new Error(`Action ${index} missing type`);
            }
            if (!action.payload || typeof action.payload !== 'object') {
                throw new Error(`Action ${index} missing or invalid payload`);
            }
        });
    }
    /**
     * Helper: Create a "low confidence" output that asks for clarification
     */
    createClarificationOutput(question, summary = 'Need more information') {
        return {
            actions: [
                {
                    type: 'ASK_FOR_DETAILS',
                    payload: {
                        message: question,
                    },
                },
            ],
            summary,
            confidence: 0.4,
            followUpNeeded: true,
        };
    }
    /**
     * Helper: Create a "no action" output
     */
    createNoActionOutput(summary) {
        return {
            actions: [
                {
                    type: 'NO_ACTION',
                    payload: {},
                },
            ],
            summary,
            confidence: 1.0,
            followUpNeeded: false,
        };
    }
    /**
     * Helper: Extract message content from context
     */
    getMessageContent(context) {
        return context.input.message || '';
    }
    /**
     * Helper: Check if customer has opted out
     */
    hasOptedOut(message) {
        const optOutKeywords = ['stop', 'unsubscribe', 'no', 'opt out', 'remove'];
        const normalized = message.toLowerCase().trim();
        return optOutKeywords.some((keyword) => normalized === keyword);
    }
    /**
     * Helper: Get conversation history as string
     */
    getHistoryString(context) {
        if (!context.history || context.history.length === 0) {
            return 'No previous conversation history.';
        }
        return context.history
            .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
            .join('\n');
    }
}
exports.BaseAgent = BaseAgent;
//# sourceMappingURL=BaseAgent.js.map