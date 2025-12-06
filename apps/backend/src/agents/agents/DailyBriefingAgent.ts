/**
 * Daily Briefing Agent (AUTOMATION TIER #12)
 * Sends morning briefing with today's schedule
 */

import { BaseAgent } from '../base/BaseAgent';
import type { AgentConfig, AgentContext, AgentOutput } from '../base/types';

export class DailyBriefingAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'DailyBriefing',
      tier: 'AUTOMATION',
      triggers: ['DAILY_CRON'],
      priority: 65,
      enabled: true,
      confidenceThreshold: 0.6,
      rateLimits: {
        maxExecutionsPerDay: 1,
      },
      llmConfig: {
        model: 'gpt-4o-mini',
        temperature: 0.5,
        maxTokens: 1024,
      },
    };
    super(config);
  }

  async execute(context: AgentContext): Promise<AgentOutput> {
    throw new Error('Agent must be executed through AgentEngine');
  }
}
