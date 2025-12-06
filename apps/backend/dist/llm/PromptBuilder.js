"use strict";
/**
 * PromptBuilder - Constructs prompts for agents with context injection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptBuilder = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
class PromptBuilder {
    promptsDir;
    constructor(promptsDir) {
        this.promptsDir = promptsDir || (0, path_1.join)(__dirname, '../agents/prompts');
    }
    /**
     * Build complete prompt for an agent
     */
    buildPrompt(agentName, context, additionalInstructions) {
        const basePrompt = this.loadAgentPrompt(agentName);
        const systemPrompt = this.buildSystemPrompt(basePrompt, context);
        const userPrompt = this.buildUserPrompt(context, additionalInstructions);
        return { systemPrompt, userPrompt };
    }
    /**
     * Load agent prompt template from file
     */
    loadAgentPrompt(agentName) {
        try {
            const promptPath = (0, path_1.join)(this.promptsDir, `${agentName}.txt`);
            return (0, fs_1.readFileSync)(promptPath, 'utf-8');
        }
        catch (error) {
            console.warn(`Could not load prompt for ${agentName}, using default`);
            return this.getDefaultPrompt(agentName);
        }
    }
    /**
     * Build system prompt with context
     */
    buildSystemPrompt(basePrompt, context) {
        let systemPrompt = basePrompt;
        // Inject client settings if available
        if (context.clientSettings) {
            systemPrompt += `\n\n## Business Information\n`;
            systemPrompt += `Business Name: ${context.clientSettings.businessName}\n`;
            systemPrompt += `Services: ${context.clientSettings.services}\n`;
            systemPrompt += `Availability: ${context.clientSettings.availability}\n`;
            systemPrompt += `Pricing: ${context.clientSettings.pricing}\n`;
        }
        // Add output format requirements
        systemPrompt += `\n\n## Output Format\n`;
        systemPrompt += `You MUST respond with valid JSON in this exact structure:\n`;
        systemPrompt += `{
  "actions": [
    {
      "type": "ACTION_TYPE",
      "payload": { ...action-specific data... }
    }
  ],
  "summary": "Brief summary of your decision",
  "confidence": 0.85,
  "followUpNeeded": true/false
}\n\n`;
        systemPrompt += `Available action types:\n`;
        systemPrompt += `- SEND_MESSAGE: Send a message to the customer\n`;
        systemPrompt += `- CREATE_BOOKING: Create a new booking\n`;
        systemPrompt += `- UPDATE_BOOKING: Update existing booking\n`;
        systemPrompt += `- CANCEL_BOOKING: Cancel a booking\n`;
        systemPrompt += `- SUGGEST_SLOTS: Suggest available time slots\n`;
        systemPrompt += `- ASK_FOR_DETAILS: Ask customer for more information\n`;
        systemPrompt += `- UPDATE_CUSTOMER: Update customer information\n`;
        systemPrompt += `- CREATE_LEAD: Create a new lead\n`;
        systemPrompt += `- UPDATE_LEAD: Update lead status\n`;
        systemPrompt += `- LOG_INSIGHT: Log business insight\n`;
        systemPrompt += `- SEND_NOTIFICATION: Send admin notification\n`;
        systemPrompt += `- REQUEST_REVIEW: Request customer review\n`;
        systemPrompt += `- SEND_PAYMENT_REMINDER: Send payment reminder\n`;
        systemPrompt += `- NO_ACTION: No action needed\n\n`;
        systemPrompt += `IMPORTANT RULES:\n`;
        systemPrompt += `- If confidence < 0.55, use ASK_FOR_DETAILS action\n`;
        systemPrompt += `- NEVER create/modify bookings without explicit customer confirmation\n`;
        systemPrompt += `- ALWAYS be polite and professional\n`;
        systemPrompt += `- Respect opt-out keywords (STOP, UNSUBSCRIBE)\n`;
        systemPrompt += `- Keep messages concise and clear\n`;
        return systemPrompt;
    }
    /**
     * Build user prompt with context
     */
    buildUserPrompt(context, additionalInstructions) {
        let userPrompt = '';
        // Add conversation history
        if (context.history && context.history.length > 0) {
            userPrompt += `## Conversation History\n`;
            context.history.forEach((msg) => {
                userPrompt += `${msg.role.toUpperCase()}: ${msg.content}\n`;
            });
            userPrompt += `\n`;
        }
        // Add customer data
        if (context.customerData) {
            userPrompt += `## Customer Information\n`;
            userPrompt += `Name: ${context.customerData.name || 'Unknown'}\n`;
            userPrompt += `Phone: ${context.customerData.phone}\n`;
            if (context.customerData.email) {
                userPrompt += `Email: ${context.customerData.email}\n`;
            }
            if (context.customerData.previousBookings) {
                userPrompt += `Previous Bookings: ${context.customerData.previousBookings}\n`;
            }
            if (context.customerData.tags && context.customerData.tags.length > 0) {
                userPrompt += `Tags: ${context.customerData.tags.join(', ')}\n`;
            }
            userPrompt += `\n`;
        }
        // Add current message/trigger
        userPrompt += `## Current Request\n`;
        userPrompt += `Trigger: ${context.trigger}\n`;
        if (context.input.message) {
            userPrompt += `Message: ${context.input.message}\n`;
        }
        if (context.input.metadata) {
            userPrompt += `Metadata: ${JSON.stringify(context.input.metadata, null, 2)}\n`;
        }
        // Add additional instructions
        if (additionalInstructions) {
            userPrompt += `\n## Additional Instructions\n`;
            userPrompt += additionalInstructions;
        }
        userPrompt += `\nProvide your response as JSON following the output format specified in the system prompt.`;
        return userPrompt;
    }
    /**
     * Get default prompt for agents without prompt files
     */
    getDefaultPrompt(agentName) {
        return `You are the ${agentName} agent for JobRun, an AI-powered booking system.

Your role is to analyze incoming requests and provide structured actions to help manage bookings, customers, and business operations.

You must always respond with valid JSON containing:
- actions: Array of structured actions to take
- summary: Brief explanation of your decision
- confidence: Your confidence level (0-1)
- followUpNeeded: Whether additional interaction is needed

Be helpful, professional, and follow the business rules provided in the context.`;
    }
}
exports.PromptBuilder = PromptBuilder;
//# sourceMappingURL=PromptBuilder.js.map