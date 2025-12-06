"use strict";
/**
 * AdminLogger - Centralized logging for AI scheduling events
 * Logs important events for admin monitoring and debugging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminLogger = void 0;
class AdminLogger {
    static logs = [];
    static MAX_LOGS = 10000; // Keep last 10k logs in memory
    /**
     * Log an event
     */
    static log(eventType, conversationId, clientId, data = {}) {
        const entry = {
            timestamp: new Date(),
            conversationId,
            clientId,
            eventType,
            data,
        };
        this.logs.push(entry);
        // Trim logs if exceeding max
        if (this.logs.length > this.MAX_LOGS) {
            this.logs = this.logs.slice(-this.MAX_LOGS);
        }
        // Console log for development (can be disabled in production)
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[ADMIN LOG] ${eventType.toUpperCase()} - Conversation: ${conversationId.substring(0, 8)}...`, data);
        }
        // TODO: In production, send to database or external logging service
        // await prisma.adminLog.create({ data: entry });
    }
    /**
     * Get logs for a specific conversation
     */
    static getConversationLogs(conversationId) {
        return this.logs.filter((log) => log.conversationId === conversationId);
    }
    /**
     * Get logs by event type
     */
    static getLogsByType(eventType) {
        return this.logs.filter((log) => log.eventType === eventType);
    }
    /**
     * Get recent logs
     */
    static getRecentLogs(limit = 100) {
        return this.logs.slice(-limit);
    }
    /**
     * Get logs for a specific client
     */
    static getClientLogs(clientId) {
        return this.logs.filter((log) => log.clientId === clientId);
    }
    /**
     * Clear all logs (use with caution)
     */
    static clearLogs() {
        this.logs = [];
    }
    /**
     * Get log count
     */
    static getLogCount() {
        return this.logs.length;
    }
}
exports.AdminLogger = AdminLogger;
//# sourceMappingURL=AdminLogger.js.map