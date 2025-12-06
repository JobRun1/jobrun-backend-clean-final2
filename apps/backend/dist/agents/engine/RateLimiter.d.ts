/**
 * RateLimiter - Prevents agent abuse and runaway loops
 */
import type { AgentConfig, RateLimitCheck } from '../base/types';
export declare class RateLimiter {
    private executionCounts;
    private customerMessageCounts;
    private readonly GLOBAL_MAX_PER_HOUR;
    private readonly GLOBAL_MAX_PER_DAY;
    private readonly CUSTOMER_MAX_PROACTIVE_PER_6H;
    private readonly CUSTOMER_REVIEW_REQUEST_COOLDOWN_HOURS;
    private readonly CUSTOMER_PAYMENT_REMINDER_COOLDOWN_HOURS;
    /**
     * Check if agent execution is allowed
     */
    checkRateLimit(agentName: string, clientId: string, config: AgentConfig, customerId?: string): Promise<RateLimitCheck>;
    /**
     * Record an agent execution
     */
    recordExecution(agentName: string, clientId: string, customerId?: string): void;
    /**
     * Check global rate limits
     */
    private checkGlobalLimits;
    /**
     * Check agent-specific rate limits
     */
    private checkAgentLimits;
    /**
     * Check customer-specific rate limits
     */
    private checkCustomerLimits;
    /**
     * Check if agent is proactive (sends unsolicited messages)
     */
    private isProactiveAgent;
    /**
     * Clean up old entries (for memory management)
     */
    cleanup(): void;
}
//# sourceMappingURL=RateLimiter.d.ts.map