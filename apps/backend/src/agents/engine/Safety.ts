/**
 * Safety - Validates agent outputs and prevents dangerous actions
 */

import type {
  AgentContext,
  AgentOutput,
  SafetyCheckResult,
  AgentAction,
} from '../base/types';

export class Safety {
  private processedMessages: Set<string> = new Set();

  /**
   * Check if agent output is safe to execute
   */
  async checkOutput(
    output: AgentOutput,
    context: AgentContext,
    agentName: string
  ): Promise<SafetyCheckResult> {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Check 1: Confidence threshold
    if (output.confidence < 0.55) {
      violations.push(
        `Confidence too low (${output.confidence}). Must be >= 0.55 to execute actions.`
      );
    }

    // Check 2: No duplicate message processing
    const messageHash = this.getMessageHash(context);
    if (this.processedMessages.has(messageHash)) {
      violations.push('Message already processed by this agent. Preventing duplicate execution.');
    }

    // Check 3: Validate each action
    for (const action of output.actions) {
      const actionCheck = this.checkAction(action, context, agentName);
      violations.push(...actionCheck.violations);
      warnings.push(...actionCheck.warnings);
    }

    // Check 4: Opt-out detection
    if (context.input.message) {
      const optOutDetected = this.detectOptOut(context.input.message);
      if (optOutDetected && this.hasProactiveActions(output)) {
        violations.push('Customer has opted out. Cannot send proactive messages.');
      }
    }

    // Check 5: Demo mode restrictions
    if (agentName === 'DemoMode' && !this.isAdminContext(context)) {
      violations.push('Demo Mode agent can only run in admin context.');
    }

    return {
      safe: violations.length === 0,
      violations,
      warnings,
    };
  }

  /**
   * Mark message as processed
   */
  markProcessed(context: AgentContext): void {
    const messageHash = this.getMessageHash(context);
    this.processedMessages.add(messageHash);

    // Clean up old entries (keep last 1000)
    if (this.processedMessages.size > 1000) {
      const entries = Array.from(this.processedMessages);
      this.processedMessages = new Set(entries.slice(-1000));
    }
  }

  /**
   * Check individual action safety
   */
  private checkAction(
    action: AgentAction,
    context: AgentContext,
    agentName: string
  ): SafetyCheckResult {
    const violations: string[] = [];
    const warnings: string[] = [];

    switch (action.type) {
      case 'CREATE_BOOKING':
      case 'UPDATE_BOOKING':
        // Must have customer confirmation
        if (!this.hasCustomerConfirmation(context, action)) {
          violations.push(
            `${action.type} requires explicit customer confirmation. Not detected in context.`
          );
        }
        // Must include required booking fields
        if (!action.payload.customerId || !action.payload.serviceType || !action.payload.startTime) {
          violations.push(`${action.type} missing required fields (customerId, serviceType, startTime)`);
        }
        break;

      case 'CANCEL_BOOKING':
        // Must have customer confirmation
        if (!this.hasCustomerConfirmation(context, action)) {
          violations.push('CANCEL_BOOKING requires explicit customer confirmation.');
        }
        break;

      case 'SEND_PAYMENT_REMINDER':
        // Only BillingNudger can send payment reminders
        if (agentName !== 'BillingNudger') {
          violations.push('Only BillingNudger agent can send payment reminders.');
        }
        // Must be polite
        if (action.payload.message && this.isAggressiveTone(action.payload.message)) {
          violations.push('Payment reminder tone is too aggressive.');
        }
        break;

      case 'UPDATE_SETTINGS':
        // Never change prices automatically
        if (action.payload.pricing) {
          violations.push('Agents cannot change pricing automatically. Requires manual approval.');
        }
        // Warn on critical settings
        if (action.payload.availability || action.payload.services) {
          warnings.push('Modifying critical settings (availability/services). Verify carefully.');
        }
        break;

      case 'SEND_MESSAGE':
        // Check message content
        if (!action.payload.message || action.payload.message.trim().length === 0) {
          violations.push('SEND_MESSAGE action has empty message content.');
        }
        // Check for spam indicators
        if (action.payload.message && this.isSpammy(action.payload.message)) {
          violations.push('Message content appears spammy.');
        }
        break;

      case 'CREATE_DEMO_DATA':
        // Only Demo Mode agent
        if (agentName !== 'DemoMode') {
          violations.push('Only DemoMode agent can create demo data.');
        }
        break;
    }

    return { safe: violations.length === 0, violations, warnings };
  }

  /**
   * Check if context contains customer confirmation
   */
  private hasCustomerConfirmation(context: AgentContext, action: AgentAction): boolean {
    if (!context.input.message) {
      return false;
    }

    const message = context.input.message.toLowerCase();
    const confirmationKeywords = [
      'yes',
      'yeah',
      'yep',
      'sure',
      'ok',
      'okay',
      'confirm',
      'book it',
      'sounds good',
      'perfect',
      'that works',
    ];

    return confirmationKeywords.some((keyword) => message.includes(keyword));
  }

  /**
   * Detect opt-out keywords
   */
  private detectOptOut(message: string): boolean {
    const optOutKeywords = ['stop', 'unsubscribe', 'opt out', 'remove me', 'leave me alone'];
    const normalized = message.toLowerCase().trim();
    return optOutKeywords.some((keyword) => normalized.includes(keyword));
  }

  /**
   * Check if output contains proactive actions
   */
  private hasProactiveActions(output: AgentOutput): boolean {
    const proactiveActionTypes = [
      'SEND_MESSAGE',
      'SEND_PAYMENT_REMINDER',
      'REQUEST_REVIEW',
      'SEND_NOTIFICATION',
    ];
    return output.actions.some((action) => proactiveActionTypes.includes(action.type));
  }

  /**
   * Check if tone is aggressive
   */
  private isAggressiveTone(message: string): boolean {
    const aggressiveKeywords = [
      'immediately',
      'must pay now',
      'final warning',
      'legal action',
      'debt collection',
      'overdue payment',
      '!!!',
    ];
    const normalized = message.toLowerCase();
    return aggressiveKeywords.some((keyword) => normalized.includes(keyword));
  }

  /**
   * Check if message is spammy
   */
  private isSpammy(message: string): boolean {
    // Check for excessive repetition
    const words = message.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 10 && uniqueWords.size < words.length * 0.3) {
      return true;
    }

    // Check for excessive punctuation
    const punctuationCount = (message.match(/[!?]{2,}/g) || []).length;
    if (punctuationCount > 3) {
      return true;
    }

    // Check for spam keywords
    const spamKeywords = ['click here', 'limited time', 'act now', 'free money', 'winner'];
    const normalized = message.toLowerCase();
    return spamKeywords.some((keyword) => normalized.includes(keyword));
  }

  /**
   * Check if context is admin
   */
  private isAdminContext(context: AgentContext): boolean {
    return context.input.metadata?.isAdmin === true;
  }

  /**
   * Generate unique hash for message
   */
  private getMessageHash(context: AgentContext): string {
    return `${context.clientId}:${context.conversationId}:${context.trigger}:${context.input.message || 'no-message'}`;
  }

  /**
   * Clean up old processed messages
   */
  cleanup(): void {
    if (this.processedMessages.size > 10000) {
      const entries = Array.from(this.processedMessages);
      this.processedMessages = new Set(entries.slice(-5000));
    }
  }
}
