/**
 * AdminLogger - Centralized logging for AI scheduling events
 * Logs important events for admin monitoring and debugging
 */

export type AdminLogEventType =
  | 'parsed_date'
  | 'parsed_time'
  | 'slot_chosen'
  | 'urgency_detected'
  | 'contradiction_detected'
  | 'loop_detected'
  | 'unsafe_content'
  | 'fallback_triggered'
  | 'booking_success'
  | 'booking_failure'
  | 'booking_created'
  | 'booking_error'
  | 'memory_reset'
  | 'path_chosen'
  | 'clarification_needed'
  | 'error'
  | 'handover_triggered'
  | 'handover_suppressed'
  | 'handover_notified'
  | 'handover_closed'
  | 'handover_manual_trigger'
  | 'human_reply_sent'
  | 'ai_silenced_for_handover';

export interface AdminLogEntry {
  timestamp: Date;
  conversationId: string;
  clientId: string;
  eventType: AdminLogEventType;
  data: any;
}

export class AdminLogger {
  private static logs: AdminLogEntry[] = [];
  private static readonly MAX_LOGS = 10000; // Keep last 10k logs in memory

  /**
   * Log an event
   */
  static log(
    eventType: AdminLogEventType,
    conversationId: string,
    clientId: string,
    data: any = {}
  ): void {
    const entry: AdminLogEntry = {
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
      console.log(
        `[ADMIN LOG] ${eventType.toUpperCase()} - Conversation: ${conversationId.substring(0, 8)}...`,
        data
      );
    }

    // TODO: In production, send to database or external logging service
    // await prisma.adminLog.create({ data: entry });
  }

  /**
   * Get logs for a specific conversation
   */
  static getConversationLogs(conversationId: string): AdminLogEntry[] {
    return this.logs.filter((log) => log.conversationId === conversationId);
  }

  /**
   * Get logs by event type
   */
  static getLogsByType(eventType: AdminLogEventType): AdminLogEntry[] {
    return this.logs.filter((log) => log.eventType === eventType);
  }

  /**
   * Get recent logs
   */
  static getRecentLogs(limit: number = 100): AdminLogEntry[] {
    return this.logs.slice(-limit);
  }

  /**
   * Get logs for a specific client
   */
  static getClientLogs(clientId: string): AdminLogEntry[] {
    return this.logs.filter((log) => log.clientId === clientId);
  }

  /**
   * Clear all logs (use with caution)
   */
  static clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get log count
   */
  static getLogCount(): number {
    return this.logs.length;
  }
}
