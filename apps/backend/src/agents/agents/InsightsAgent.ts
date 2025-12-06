/**
 * Insights Agent (AUTOMATION TIER #6)
 * Generates weekly business insights
 */

import { BaseAgent } from '../base/BaseAgent';
import type { AgentConfig, AgentContext, AgentOutput } from '../base/types';

export class InsightsAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'Insights',
      tier: 'AUTOMATION',
      triggers: ['WEEKLY_CRON'],
      priority: 70,
      enabled: true,
      confidenceThreshold: 0.6,
      rateLimits: {
        maxExecutionsPerDay: 1,
      },
      llmConfig: {
        model: 'gpt-4o',
        temperature: 0.6,
        maxTokens: 2048,
      },
    };
    super(config);
  }

  async execute(context: AgentContext): Promise<AgentOutput> {
    throw new Error('Agent must be executed through AgentEngine');
  }
}
