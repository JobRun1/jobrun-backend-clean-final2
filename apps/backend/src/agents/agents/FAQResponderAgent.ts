/**
 * FAQ Responder Agent (ELITE TIER #17)
 * Quick answers for common questions (price, area, availability)
 */

import { BaseAgent } from '../base/BaseAgent';
import type { AgentConfig, AgentContext, AgentOutput } from '../base/types';

export class FAQResponderAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'FAQResponder',
      tier: 'ELITE',
      triggers: ['INBOUND_SMS'],
      priority: 90,
      enabled: true,
      confidenceThreshold: 0.75,
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
