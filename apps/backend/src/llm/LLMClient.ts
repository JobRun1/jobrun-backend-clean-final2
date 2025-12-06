/**
 * LLMClient - OpenAI-only LLM client
 */

import OpenAI from 'openai';

export type LLMProvider = 'openai';
export type LLMModel = 'gpt-4' | 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo';

export interface LLMRequest {
  model: LLMModel;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface LLMResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: LLMProvider;
}

export class LLMClient {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate completion with OpenAI
   */
  async generate(request: LLMRequest): Promise<LLMResponse> {
    return await this.generateOpenAI(request);
  }

  /**
   * Generate with OpenAI
   */
  private async generateOpenAI(request: LLMRequest): Promise<LLMResponse> {
    const modelMap: Record<string, string> = {
      'gpt-4': 'gpt-4-turbo-preview',
      'gpt-4o': 'gpt-4o',
      'gpt-4o-mini': 'gpt-4o-mini',
      'gpt-3.5-turbo': 'gpt-3.5-turbo',
    };

    const model = modelMap[request.model] || 'gpt-4o-mini';

    const messages: OpenAI.ChatCompletionMessageParam[] = [
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

/**
 * Simple helper function for quick AI completions
 */
export async function runModel(prompt: string): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
  });

  return completion.choices[0].message.content || '';
}
