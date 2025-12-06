"use strict";
/**
 * RateLimiter - Prevents agent abuse and runaway loops
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
class RateLimiter {
    executionCounts = new Map();
    customerMessageCounts = new Map();
    // Global safety limits
    GLOBAL_MAX_PER_HOUR = 100;
    GLOBAL_MAX_PER_DAY = 500;
    // Customer-specific limits for proactive messages
    CUSTOMER_MAX_PROACTIVE_PER_6H = 1;
    CUSTOMER_REVIEW_REQUEST_COOLDOWN_HOURS = 168; // 7 days
    CUSTOMER_PAYMENT_REMINDER_COOLDOWN_HOURS = 72;
    /**
     * Check if agent execution is allowed
     */
    async checkRateLimit(agentName, clientId, config, customerId) {
        const key = `${agentName}:${clientId}`;
        // Check global limits
        const globalCheck = this.checkGlobalLimits(key);
        if (!globalCheck.allowed) {
            return globalCheck;
        }
        // Check agent-specific limits
        if (config.rateLimits) {
            const agentCheck = this.checkAgentLimits(key, config.rateLimits);
            if (!agentCheck.allowed) {
                return agentCheck;
            }
        }
        // Check customer-specific limits for proactive agents
        if (customerId && this.isProactiveAgent(agentName)) {
            const customerCheck = this.checkCustomerLimits(agentName, clientId, customerId);
            if (!customerCheck.allowed) {
                return customerCheck;
            }
        }
        return { allowed: true };
    }
    /**
     * Record an agent execution
     */
    recordExecution(agentName, clientId, customerId) {
        const key = `${agentName}:${clientId}`;
        const now = new Date();
        const entry = this.executionCounts.get(key);
        if (entry) {
            entry.count++;
            entry.lastExecutionAt = now;
        }
        else {
            this.executionCounts.set(key, {
                count: 1,
                firstExecutionAt: now,
                lastExecutionAt: now,
            });
        }
        // Record customer-specific execution for proactive agents
        if (customerId && this.isProactiveAgent(agentName)) {
            const customerKey = `${agentName}:${clientId}:${customerId}`;
            const customerEntry = this.customerMessageCounts.get(customerKey);
            if (customerEntry) {
                customerEntry.count++;
                customerEntry.lastExecutionAt = now;
            }
            else {
                this.customerMessageCounts.set(customerKey, {
                    count: 1,
                    firstExecutionAt: now,
                    lastExecutionAt: now,
                });
            }
        }
    }
    /**
     * Check global rate limits
     */
    checkGlobalLimits(key) {
        const entry = this.executionCounts.get(key);
        if (!entry) {
            return { allowed: true };
        }
        const now = new Date();
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        // Clean up old entries
        if (entry.firstExecutionAt < dayAgo) {
            this.executionCounts.delete(key);
            return { allowed: true };
        }
        // Check hourly limit
        if (entry.firstExecutionAt > hourAgo && entry.count >= this.GLOBAL_MAX_PER_HOUR) {
            return {
                allowed: false,
                reason: 'Global hourly rate limit exceeded',
                retryAfterMs: entry.firstExecutionAt.getTime() + 60 * 60 * 1000 - now.getTime(),
            };
        }
        // Check daily limit
        if (entry.count >= this.GLOBAL_MAX_PER_DAY) {
            return {
                allowed: false,
                reason: 'Global daily rate limit exceeded',
                retryAfterMs: entry.firstExecutionAt.getTime() + 24 * 60 * 60 * 1000 - now.getTime(),
            };
        }
        return { allowed: true };
    }
    /**
     * Check agent-specific rate limits
     */
    checkAgentLimits(key, limits) {
        const entry = this.executionCounts.get(key);
        if (!entry) {
            return { allowed: true };
        }
        const now = new Date();
        // Check cooldown
        if (limits.cooldownMinutes) {
            const cooldownMs = limits.cooldownMinutes * 60 * 1000;
            const timeSinceLastExecution = now.getTime() - entry.lastExecutionAt.getTime();
            if (timeSinceLastExecution < cooldownMs) {
                return {
                    allowed: false,
                    reason: 'Agent cooldown period active',
                    retryAfterMs: cooldownMs - timeSinceLastExecution,
                };
            }
        }
        // Check hourly limit
        if (limits.maxExecutionsPerHour) {
            const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            if (entry.firstExecutionAt > hourAgo && entry.count >= limits.maxExecutionsPerHour) {
                return {
                    allowed: false,
                    reason: 'Agent hourly rate limit exceeded',
                    retryAfterMs: entry.firstExecutionAt.getTime() + 60 * 60 * 1000 - now.getTime(),
                };
            }
        }
        // Check daily limit
        if (limits.maxExecutionsPerDay) {
            const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            if (entry.firstExecutionAt > dayAgo && entry.count >= limits.maxExecutionsPerDay) {
                return {
                    allowed: false,
                    reason: 'Agent daily rate limit exceeded',
                    retryAfterMs: entry.firstExecutionAt.getTime() + 24 * 60 * 60 * 1000 - now.getTime(),
                };
            }
        }
        return { allowed: true };
    }
    /**
     * Check customer-specific rate limits
     */
    checkCustomerLimits(agentName, clientId, customerId) {
        const key = `${agentName}:${clientId}:${customerId}`;
        const entry = this.customerMessageCounts.get(key);
        if (!entry) {
            return { allowed: true };
        }
        const now = new Date();
        // Check 6-hour proactive message limit
        const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        if (entry.lastExecutionAt > sixHoursAgo && entry.count >= this.CUSTOMER_MAX_PROACTIVE_PER_6H) {
            return {
                allowed: false,
                reason: 'Customer proactive message limit exceeded (max 1 per 6 hours)',
                retryAfterMs: entry.lastExecutionAt.getTime() + 6 * 60 * 60 * 1000 - now.getTime(),
            };
        }
        // Special cooldowns for specific agent types
        if (agentName === 'ReviewManager') {
            const cooldownMs = this.CUSTOMER_REVIEW_REQUEST_COOLDOWN_HOURS * 60 * 60 * 1000;
            const timeSinceLastExecution = now.getTime() - entry.lastExecutionAt.getTime();
            if (timeSinceLastExecution < cooldownMs) {
                return {
                    allowed: false,
                    reason: 'Review request cooldown active (max 1 per week)',
                    retryAfterMs: cooldownMs - timeSinceLastExecution,
                };
            }
        }
        if (agentName === 'BillingNudger') {
            const cooldownMs = this.CUSTOMER_PAYMENT_REMINDER_COOLDOWN_HOURS * 60 * 60 * 1000;
            const timeSinceLastExecution = now.getTime() - entry.lastExecutionAt.getTime();
            if (timeSinceLastExecution < cooldownMs) {
                return {
                    allowed: false,
                    reason: 'Payment reminder cooldown active (max 1 per 72 hours)',
                    retryAfterMs: cooldownMs - timeSinceLastExecution,
                };
            }
        }
        return { allowed: true };
    }
    /**
     * Check if agent is proactive (sends unsolicited messages)
     */
    isProactiveAgent(agentName) {
        const proactiveAgents = [
            'SmartFollowUp',
            'ReviewManager',
            'BillingNudger',
            'DailyBriefing',
            'AutoRescheduler',
        ];
        return proactiveAgents.includes(agentName);
    }
    /**
     * Clean up old entries (for memory management)
     */
    cleanup() {
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        // Clean execution counts
        for (const [key, entry] of this.executionCounts.entries()) {
            if (entry.firstExecutionAt < dayAgo) {
                this.executionCounts.delete(key);
            }
        }
        // Clean customer message counts
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        for (const [key, entry] of this.customerMessageCounts.entries()) {
            if (entry.firstExecutionAt < weekAgo) {
                this.customerMessageCounts.delete(key);
            }
        }
    }
}
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=RateLimiter.js.map