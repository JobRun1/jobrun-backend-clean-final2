/**
 * Data Validator Agent (CORE TIER #5)
 * Health-checks business setup and settings
 */

import { BaseAgent } from '../base/BaseAgent';
import type { AgentConfig, AgentContext, AgentOutput } from '../base/types';

export class DataValidatorAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'DataValidator',
      tier: 'CORE',
      triggers: ['SETTINGS_CHANGED', 'NEW_CUSTOMER'],
      priority: 60,
      enabled: true,
      confidenceThreshold: 0.7,
      llmConfig: {
        model: 'gpt-4o-mini',
        temperature: 0.3,
        maxTokens: 512,
      },
    };
    super(config);
  }

  async execute(context: AgentContext): Promise<AgentOutput> {
    throw new Error('Agent must be executed through AgentEngine');
  }
}
