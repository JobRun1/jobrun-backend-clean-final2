/**
 * Summariser Agent (CORE TIER #3)
 * Summarizes conversations for CRM
 */

import { BaseAgent } from '../base/BaseAgent';
import type { AgentConfig, AgentContext, AgentOutput } from '../base/types';

export class SummariserAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'Summariser',
      tier: 'CORE',
      triggers: ['CONVERSATION_CLOSE', 'BOOKING_REQUEST'],
      priority: 50,
      enabled: true,
      confidenceThreshold: 0.5,
      llmConfig: {
        model: 'gpt-4o-mini',
        temperature: 0.5,
        maxTokens: 512,
      },
    };
    super(config);
  }

  async execute(context: AgentContext): Promise<AgentOutput> {
    throw new Error('Agent must be executed through AgentEngine');
  }
}
