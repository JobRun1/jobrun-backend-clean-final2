"use strict";
/**
 * AgentEngine - Core engine for executing individual agents with LLM
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentEngine = void 0;
const LLMClient_1 = require("../../llm/LLMClient");
const PromptBuilder_1 = require("../../llm/PromptBuilder");
const OutputParser_1 = require("../../llm/OutputParser");
const SafetyValidator_1 = require("../../llm/SafetyValidator");
const ModelRouter_1 = require("../../llm/ModelRouter");
class AgentEngine {
    llmClient;
    promptBuilder;
    outputParser;
    safetyValidator;
    modelRouter;
    constructor() {
        this.llmClient = new LLMClient_1.LLMClient();
        this.promptBuilder = new PromptBuilder_1.PromptBuilder();
        this.outputParser = new OutputParser_1.OutputParser();
        this.safetyValidator = new SafetyValidator_1.SafetyValidator();
        this.modelRouter = new ModelRouter_1.ModelRouter();
    }
    /**
     * Execute an agent with LLM
     */
    async executeAgent(agent, context) {
        const startTime = Date.now();
        try {
            // Build prompts
            const { systemPrompt, userPrompt } = this.promptBuilder.buildPrompt(agent.getName(), context);
            // Validate prompts
            const promptSafety = this.safetyValidator.validatePrompt(systemPrompt, userPrompt, context);
            if (!promptSafety.safe) {
                throw new Error(`Prompt safety check failed: ${promptSafety.issues.join(', ')}`);
            }
            // Get model for this agent
            const config = agent.getConfig();
            const model = config.llmConfig.model;
            // Call LLM
            const llmResponse = await this.llmClient.generate({
                model,
                systemPrompt,
                userPrompt,
                temperature: config.llmConfig.temperature,
                maxTokens: config.llmConfig.maxTokens,
                jsonMode: true,
            });
            // Validate output
            const outputSafety = this.safetyValidator.validateOutput(llmResponse.content);
            if (!outputSafety.safe) {
                throw new Error(`Output safety check failed: ${outputSafety.issues.join(', ')}`);
            }
            // Parse output
            const output = this.outputParser.parseWithRetry(llmResponse.content);
            // Validate output structure
            this.validateAgentOutput(output);
            // Return successful result
            const executionTimeMs = Date.now() - startTime;
            return {
                agentName: agent.getName(),
                success: true,
                output,
                executionTimeMs,
                timestamp: new Date(),
            };
        }
        catch (error) {
            const executionTimeMs = Date.now() - startTime;
            return {
                agentName: agent.getName(),
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                executionTimeMs,
                timestamp: new Date(),
            };
        }
    }
    /**
     * Validate agent output meets minimum requirements
     */
    validateAgentOutput(output) {
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
}
exports.AgentEngine = AgentEngine;
//# sourceMappingURL=AgentEngine.js.map