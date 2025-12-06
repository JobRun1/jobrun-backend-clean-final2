/**
 * AdminLogger - Centralized logging for AI scheduling events
 * Logs important events for admin monitoring and debugging
 */
export type AdminLogEventType = 'parsed_date' | 'parsed_time' | 'slot_chosen' | 'urgency_detected' | 'contradiction_detected' | 'loop_detected' | 'unsafe_content' | 'fallback_triggered' | 'booking_success' | 'booking_failure' | 'booking_created' | 'booking_error' | 'memory_reset' | 'path_chosen' | 'clarification_needed' | 'error' | 'handover_triggered' | 'handover_suppressed' | 'handover_notified' | 'handover_closed' | 'handover_manual_trigger' | 'human_reply_sent' | 'ai_silenced_for_handover';
export interface AdminLogEntry {
    timestamp: Date;
    conversationId: string;
    clientId: string;
    eventType: AdminLogEventType;
    data: any;
}
export declare class AdminLogger {
    private static logs;
    private static readonly MAX_LOGS;
    /**
     * Log an event
     */
    static log(eventType: AdminLogEventType, conversationId: string, clientId: string, data?: any): void;
    /**
     * Get logs for a specific conversation
     */
    static getConversationLogs(conversationId: string): AdminLogEntry[];
    /**
     * Get logs by event type
     */
    static getLogsByType(eventType: AdminLogEventType): AdminLogEntry[];
    /**
     * Get recent logs
     */
    static getRecentLogs(limit?: number): AdminLogEntry[];
    /**
     * Get logs for a specific client
     */
    static getClientLogs(clientId: string): AdminLogEntry[];
    /**
     * Clear all logs (use with caution)
     */
    static clearLogs(): void;
    /**
     * Get log count
     */
    static getLogCount(): number;
}
//# sourceMappingURL=AdminLogger.d.ts.map