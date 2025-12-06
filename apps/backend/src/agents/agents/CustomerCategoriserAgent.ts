/**
 * Customer Categoriser Agent (AUTOMATION TIER #8)
 * Tags customers as VIP, repeat, dormant, etc.
 */

import { BaseAgent } from '../base/BaseAgent';
import type { AgentConfig, AgentContext, AgentOutput } from '../base/types';

export class CustomerCategoriserAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'CustomerCategoriser',
      tier: 'AUTOMATION',
      triggers: ['NEW_CUSTOMER', 'BOOKING_REQUEST', 'PATTERN_DETECTED'],
      priority: 45,
      enabled: true,
      confidenceThreshold: 0.6,
      llmConfig: {
        model: 'gpt-4o-mini',
        temperature: 0.4,
        maxTokens: 512,
      },
    };
    super(config);
  }

  async execute(context: AgentContext): Promise<AgentOutput> {
    throw new Error('Agent must be executed through AgentEngine');
  }
}
