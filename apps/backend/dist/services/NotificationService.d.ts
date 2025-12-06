/**
 * NotificationService - Send SMS + Email notifications for handovers
 * PHASE 11A: Human Handover Mode
 *
 * Sends notifications to business owner when:
 * - Handover is triggered
 * - Includes customer info, last messages, urgency, reason
 */
export interface NotificationPayload {
    conversationId: string;
    customerName?: string;
    customerPhone?: string;
    lastMessages: string[];
    urgencyScore: number;
    urgencyLevel: string;
    reason: string;
    triggers: string[];
    dashboardLink: string;
}
export interface NotificationResult {
    smsSent: boolean;
    emailSent: boolean;
    errors: string[];
}
export declare class NotificationService {
    /**
     * Send handover notification (SMS + Email)
     */
    static sendHandoverNotification(clientId: string, payload: NotificationPayload): Promise<NotificationResult>;
    /**
     * Get client notification settings
     */
    private static getClientNotificationSettings;
    /**
     * Send SMS notification via Twilio
     */
    private static sendSMS;
    /**
     * Send Email notification
     */
    private static sendEmail;
    /**
     * Format SMS message (160 char limit consideration)
     */
    private static formatSMSMessage;
    /**
     * Format email subject
     */
    private static formatEmailSubject;
    /**
     * Format email body (HTML)
     */
    private static formatEmailBody;
    /**
     * Build dashboard link for conversation
     */
    static buildDashboardLink(clientId: string, conversationId: string): string;
    /**
     * Get last N messages from conversation
     */
    static getLastMessages(conversationId: string, count?: number): string[];
}
//# sourceMappingURL=NotificationService.d.ts.map