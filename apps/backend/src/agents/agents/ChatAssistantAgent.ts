/**
 * Chat Assistant Agent (ELITE TIER #16)
 * Answers client questions about the system
 */

import { BaseAgent } from '../base/BaseAgent';
import type { AgentConfig, AgentContext, AgentOutput } from '../base/types';

export class ChatAssistantAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'ChatAssistant',
      tier: 'ELITE',
      triggers: ['INBOUND_SMS', 'PATTERN_DETECTED'],
      priority: 70,
      enabled: true,
      confidenceThreshold: 0.65,
      llmConfig: {
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1536,
      },
    };
    super(config);
  }

  async execute(context: AgentContext): Promise<AgentOutput> {
    throw new Error('Agent must be executed through AgentEngine');
  }
}
