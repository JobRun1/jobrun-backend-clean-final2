/**
 * BaseAgent - Abstract base class for all JobRun agents
 * Enforces structure, safety, and output validation
 */

import type {
  AgentConfig,
  AgentContext,
  AgentOutput,
  AgentAction,
} from './types';

export abstract class BaseAgent {
  protected config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Main execution method - must be implemented by each agent
   */
  abstract execute(context: AgentContext): Promise<AgentOutput>;

  /**
   * Check if this agent should handle the given context
   */
  canHandle(context: AgentContext): boolean {
    if (!this.config.enabled) {
      return false;
    }

    return this.config.triggers.includes(context.trigger);
  }

  /**
   * Get agent configuration
   */
  getConfig(): AgentConfig {
    return this.config;
  }

  /**
   * Get agent name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Get agent priority
   */
  getPriority(): number {
    return this.config.priority;
  }

  /**
   * Validate agent output structure
   */
  protected validateOutput(output: AgentOutput): void {
    if (!output.actions || !Array.isArray(output.actions)) {
      throw new Error('Agent output must include actions array');
    }

    if (typeof output.summary !== 'string') {
      throw new Error('Agent output must include summary string');
    }

    if (
      typeof output.confidence !== 'number' ||
      output.confidence < 0 ||
      output.confidence > 1
    ) {
      throw new Error('Agent output confidence must be between 0 and 1');
    }

    if (typeof output.followUpNeeded !== 'boolean') {
      throw new Error('Agent output must include followUpNeeded boolean');
    }

    // Validate each action
    output.actions.forEach((action, index) => {
      if (!action.type) {
        throw new Error(`Action ${index} missing type`);
      }
      if (!action.payload || typeof action.payload !== 'object') {
        throw new Error(`Action ${index} missing or invalid payload`);
      }
    });
  }

  /**
   * Helper: Create a "low confidence" output that asks for clarification
   */
  protected createClarificationOutput(
    question: string,
    summary: string = 'Need more information'
  ): AgentOutput {
    return {
      actions: [
        {
          type: 'ASK_FOR_DETAILS',
          payload: {
            message: question,
          },
        },
      ],
      summary,
      confidence: 0.4,
      followUpNeeded: true,
    };
  }

  /**
   * Helper: Create a "no action" output
   */
  protected createNoActionOutput(summary: string): AgentOutput {
    return {
      actions: [
        {
          type: 'NO_ACTION',
          payload: {},
        },
      ],
      summary,
      confidence: 1.0,
      followUpNeeded: false,
    };
  }

  /**
   * Helper: Extract message content from context
   */
  protected getMessageContent(context: AgentContext): string {
    return context.input.message || '';
  }

  /**
   * Helper: Check if customer has opted out
   */
  protected hasOptedOut(message: string): boolean {
    const optOutKeywords = ['stop', 'unsubscribe', 'no', 'opt out', 'remove'];
    const normalized = message.toLowerCase().trim();
    return optOutKeywords.some((keyword) => normalized === keyword);
  }

  /**
   * Helper: Get conversation history as string
   */
  protected getHistoryString(context: AgentContext): string {
    if (!context.history || context.history.length === 0) {
      return 'No previous conversation history.';
    }

    return context.history
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');
  }
}
