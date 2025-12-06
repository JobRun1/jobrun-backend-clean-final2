/**
 * Lead Handling Agent (CORE TIER #1)
 * Handles inbound SMS and missed calls, qualifies leads
 */

import { BaseAgent } from '../base/BaseAgent';
import type { AgentConfig, AgentContext, AgentOutput } from '../base/types';

export class LeadHandlingAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'LeadHandling',
      tier: 'CORE',
      triggers: ['INBOUND_SMS', 'INBOUND_CALL'],
      priority: 100, // Highest priority for first contact
      enabled: true,
      confidenceThreshold: 0.6,
      llmConfig: {
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1024,
      },
    };
    super(config);
  }

  async execute(context: AgentContext): Promise<AgentOutput> {
    // This is a placeholder - actual execution happens through AgentEngine + LLM
    // The LLM will use the prompt from prompts/LeadHandling.txt
    throw new Error('Agent must be executed through AgentEngine');
  }
}
