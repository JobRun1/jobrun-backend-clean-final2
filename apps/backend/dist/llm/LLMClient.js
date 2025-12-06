"use strict";
/**
 * LLMClient - OpenAI-only LLM client
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMClient = void 0;
exports.runModel = runModel;
const openai_1 = __importDefault(require("openai"));
class LLMClient {
    openai;
    constructor() {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY environment variable is required');
        }
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    /**
     * Generate completion with OpenAI
     */
    async generate(request) {
        return await this.generateOpenAI(request);
    }
    /**
     * Generate with OpenAI
     */
    async generateOpenAI(request) {
        const modelMap = {
            'gpt-4': 'gpt-4-turbo-preview',
            'gpt-4o': 'gpt-4o',
            'gpt-4o-mini': 'gpt-4o-mini',
            'gpt-3.5-turbo': 'gpt-3.5-turbo',
        };
        const model = modelMap[request.model] || 'gpt-4o-mini';
        const messages = [
            {
                role: 'system',
                content: request.systemPrompt,
            },
            {
                role: 'user',
                content: request.userPrompt,
            },
        ];
        const response = await this.openai.chat.completions.create({
            model,
            messages,
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens || 4096,
            response_format: request.jsonMode ? { type: 'json_object' } : undefined,
        });
        const content = response.choices[0]?.message?.content || '';
        return {
            content,
            usage: {
                inputTokens: response.usage?.prompt_tokens || 0,
                outputTokens: response.usage?.completion_tokens || 0,
                totalTokens: response.usage?.total_tokens || 0,
            },
            model,
            provider: 'openai',
        };
    }
}
exports.LLMClient = LLMClient;
/**
 * Simple helper function for quick AI completions
 */
async function runModel(prompt) {
    const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
    });
    return completion.choices[0].message.content || '';
}
//# sourceMappingURL=LLMClient.js.map