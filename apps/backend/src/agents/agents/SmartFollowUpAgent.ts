/**
 * Smart Follow-Up Agent (AUTOMATION TIER #13)
 * Sends gentle follow-ups when no reply after timeout
 */

import { BaseAgent } from '../base/BaseAgent';
import type { AgentConfig, AgentContext, AgentOutput } from '../base/types';

export class SmartFollowUpAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'SmartFollowUp',
      tier: 'AUTOMATION',
      triggers: ['NO_REPLY_TIMEOUT'],
      priority: 55,
      enabled: true,
      confidenceThreshold: 0.6,
      rateLimits: {
        maxExecutionsPerDay: 3,
        cooldownMinutes: 360, // 6 hours
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
