/**
 * Conflict Resolver Agent (AUTOMATION TIER #11)
 * Detects and resolves calendar conflicts
 */

import { BaseAgent } from '../base/BaseAgent';
import type { AgentConfig, AgentContext, AgentOutput } from '../base/types';

export class ConflictResolverAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'ConflictResolver',
      tier: 'AUTOMATION',
      triggers: ['CALENDAR_CONFLICT', 'BOOKING_REQUEST'],
      priority: 85,
      enabled: true,
      confidenceThreshold: 0.7,
      llmConfig: {
        model: 'gpt-4o',
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
