/**
 * Review Manager Agent (AUTOMATION TIER #15)
 * Requests reviews after job completion
 */

import { BaseAgent } from '../base/BaseAgent';
import type { AgentConfig, AgentContext, AgentOutput } from '../base/types';

export class ReviewManagerAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'ReviewManager',
      tier: 'AUTOMATION',
      triggers: ['JOB_COMPLETED'],
      priority: 50,
      enabled: true,
      confidenceThreshold: 0.7,
      rateLimits: {
        cooldownMinutes: 10080, // 7 days
      },
      llmConfig: {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 512,
      },
    };
    super(config);
  }

  async execute(context: AgentContext): Promise<AgentOutput> {
    throw new Error('Agent must be executed through AgentEngine');
  }
}
