/**
 * Booking Coordinator Agent (CORE TIER #2)
 * Handles booking requests, changes, and rescheduling
 */

import { BaseAgent } from '../base/BaseAgent';
import type { AgentConfig, AgentContext, AgentOutput } from '../base/types';

export class BookingCoordinatorAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'BookingCoordinator',
      tier: 'CORE',
      triggers: ['BOOKING_REQUEST', 'INBOUND_SMS'],
      priority: 95,
      enabled: true,
      confidenceThreshold: 0.7,
      llmConfig: {
        model: 'gpt-4o',
        temperature: 0.6,
        maxTokens: 1536,
      },
    };
    super(config);
  }

  async execute(context: AgentContext): Promise<AgentOutput> {
    throw new Error('Agent must be executed through AgentEngine');
  }
}
