/**
 * Safety - Validates agent outputs and prevents dangerous actions
 */
import type { AgentContext, AgentOutput, SafetyCheckResult } from '../base/types';
export declare class Safety {
    private processedMessages;
    /**
     * Check if agent output is safe to execute
     */
    checkOutput(output: AgentOutput, context: AgentContext, agentName: string): Promise<SafetyCheckResult>;
    /**
     * Mark message as processed
     */
    markProcessed(context: AgentContext): void;
    /**
     * Check individual action safety
     */
    private checkAction;
    /**
     * Check if context contains customer confirmation
     */
    private hasCustomerConfirmation;
    /**
     * Detect opt-out keywords
     */
    private detectOptOut;
    /**
     * Check if output contains proactive actions
     */
    private hasProactiveActions;
    /**
     * Check if tone is aggressive
     */
    private isAggressiveTone;
    /**
     * Check if message is spammy
     */
    private isSpammy;
    /**
     * Check if context is admin
     */
    private isAdminContext;
    /**
     * Generate unique hash for message
     */
    private getMessageHash;
    /**
     * Clean up old processed messages
     */
    cleanup(): void;
}
//# sourceMappingURL=Safety.d.ts.map