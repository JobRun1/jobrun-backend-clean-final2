/**
 * Demo Mode Agent (ADMIN TIER #21)
 * Creates simulated bookings, messages, customers for demos
 */

import { BaseAgent } from '../base/BaseAgent';
import type { AgentConfig, AgentContext, AgentOutput } from '../base/types';

export class DemoModeAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'DemoMode',
      tier: 'ADMIN',
      triggers: ['ADMIN_ACTIVATION'],
      priority: 100,
      enabled: true,
      confidenceThreshold: 0.9,
      llmConfig: {
        model: 'gpt-4o',
        temperature: 0.8,
        maxTokens: 2048,
      },
    };
    super(config);
  }

  async execute(context: AgentContext): Promise<AgentOutput> {
    throw new Error('Agent must be executed through AgentEngine');
  }
}
