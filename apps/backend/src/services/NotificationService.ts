/**
 * NotificationService - Send SMS + Email notifications for handovers
 * PHASE 11A: Human Handover Mode
 *
 * Sends notifications to business owner when:
 * - Handover is triggered
 * - Includes customer info, last messages, urgency, reason
 */

import { ConversationMemory } from './ConversationMemory';

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

export class NotificationService {
  /**
   * Send handover notification (SMS + Email)
   */
  static async sendHandoverNotification(
    clientId: string,
    payload: NotificationPayload
  ): Promise<NotificationResult> {
    const result: NotificationResult = {
      smsSent: false,
      emailSent: false,
      errors: [],
    };

    // Get client notification settings
    const settings = await this.getClientNotificationSettings(clientId);

    if (!settings) {
      result.errors.push('Client notification settings not found');
      return result;
    }

    // Send SMS notification
    if (settings.smsEnabled && settings.phoneNumber) {
      try {
        await this.sendSMS(settings.phoneNumber, payload);
        result.smsSent = true;
      } catch (error) {
        result.errors.push(`SMS failed: ${String(error)}`);
      }
    }

    // Send Email notification
    if (settings.emailEnabled && settings.email) {
      try {
        await this.sendEmail(settings.email, payload);
        result.emailSent = true;
      } catch (error) {
        result.errors.push(`Email failed: ${String(error)}`);
      }
    }

    return result;
  }

  /**
   * Get client notification settings
   */
  private static async getClientNotificationSettings(clientId: string): Promise<{
    smsEnabled: boolean;
    emailEnabled: boolean;
    phoneNumber: string | null;
    email: string | null;
  } | null> {
    // TODO: Fetch from database
    // For now, return mock settings
    // In production, this should query Client table for notification preferences

    return {
      smsEnabled: true,
      emailEnabled: true,
      phoneNumber: process.env.ADMIN_PHONE || null,
      email: process.env.ADMIN_EMAIL || null,
    };
  }

  /**
   * Send SMS notification via Twilio
   */
  private static async sendSMS(
    phoneNumber: string,
    payload: NotificationPayload
  ): Promise<void> {
    const message = this.formatSMSMessage(payload);

    const { getTwilioClient } = await import('../twilio/client');
    const twilioClient = getTwilioClient();

    await twilioClient.messages.create({
      to: phoneNumber,
      from: process.env.TWILIO_NUMBER!,
      body: message,
    });
  }

  /**
   * Send Email notification
   */
  private static async sendEmail(
    email: string,
    payload: NotificationPayload
  ): Promise<void> {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    // For now, just log to console

    const subject = this.formatEmailSubject(payload);
    const body = this.formatEmailBody(payload);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 EMAIL NOTIFICATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`To: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${body}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // In production:
    // await sendEmail({
    //   to: email,
    //   subject,
    //   html: body,
    // });
  }

  /**
   * Format SMS message (160 char limit consideration)
   */
  private static formatSMSMessage(payload: NotificationPayload): string {
    const {
      customerName,
      customerPhone,
      urgencyLevel,
      reason,
      dashboardLink,
    } = payload;

    const customerInfo = customerName || customerPhone || 'Unknown customer';

    return `🚨 ${urgencyLevel} PRIORITY HANDOVER

Customer: ${customerInfo}
Reason: ${reason}

View conversation:
${dashboardLink}`;
  }

  /**
   * Format email subject
   */
  private static formatEmailSubject(payload: NotificationPayload): string {
    const { urgencyLevel, customerName, customerPhone } = payload;
    const customerInfo = customerName || customerPhone || 'Customer';

    return `[${urgencyLevel}] Handover Request - ${customerInfo}`;
  }

  /**
   * Format email body (HTML)
   */
  private static formatEmailBody(payload: NotificationPayload): string {
    const {
      conversationId,
      customerName,
      customerPhone,
      lastMessages,
      urgencyScore,
      urgencyLevel,
      reason,
      triggers,
      dashboardLink,
    } = payload;

    const customerInfo = customerName
      ? `${customerName} (${customerPhone || 'No phone'})`
      : customerPhone || 'Unknown customer';

    const messagesHTML = lastMessages
      .map((msg, idx) => {
        const sender = idx % 2 === 0 ? 'Customer' : 'AI';
        return `<p><strong>${sender}:</strong> ${msg}</p>`;
      })
      .join('');

    const triggersHTML = triggers.map((t) => `<li>${t}</li>`).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #f44336; color: white; padding: 20px; border-radius: 5px; }
    .urgency-high { background: #f44336; }
    .urgency-medium { background: #ff9800; }
    .urgency-low { background: #4caf50; }
    .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
    .button { display: inline-block; background: #2196f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
    .messages { background: #f9f9f9; padding: 10px; border-left: 3px solid #2196f3; }
  </style>
</head>
<body>
  <div class="header urgency-${urgencyLevel.toLowerCase()}">
    <h1>🚨 Handover Request - ${urgencyLevel} Priority</h1>
    <p>Urgency Score: ${urgencyScore}/10</p>
  </div>

  <div class="section">
    <h2>Customer Information</h2>
    <p><strong>Name:</strong> ${customerInfo}</p>
    <p><strong>Conversation ID:</strong> ${conversationId}</p>
  </div>

  <div class="section">
    <h2>Escalation Details</h2>
    <p><strong>Reason:</strong> ${reason}</p>
    <p><strong>Triggers Detected:</strong></p>
    <ul>${triggersHTML}</ul>
  </div>

  <div class="section">
    <h2>Recent Conversation</h2>
    <div class="messages">
      ${messagesHTML}
    </div>
  </div>

  <div class="section" style="text-align: center;">
    <a href="${dashboardLink}" class="button">View Full Conversation</a>
  </div>

  <hr>
  <p style="color: #999; font-size: 12px;">
    This is an automated notification from JobRun AI Scheduling Assistant.
    To configure notification settings, visit your admin dashboard.
  </p>
</body>
</html>
`;
  }

  /**
   * Build dashboard link for conversation
   */
  static buildDashboardLink(
    clientId: string,
    conversationId: string
  ): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/admin/handovers/${conversationId}`;
  }

  /**
   * Get last N messages from conversation
   */
  static getLastMessages(conversationId: string, count: number = 10): string[] {
    // Use ConversationMemory to get recent messages
    return ConversationMemory.getLastNMessages(conversationId, count);
  }
}
