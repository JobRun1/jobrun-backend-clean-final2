/**
 * HandoverManager - Manages human handover state
 * PHASE 11A: Human Handover Mode
 *
 * Manages:
 * - Starting handover (create HandoverState record)
 * - Ending handover (mark inactive)
 * - Checking handover status
 * - Notification throttling
 */

import { prisma } from '../db';
import { WebSocketGateway } from '../realtime/WebSocketGateway';

export interface HandoverState {
  id: string;
  conversationId: string;
  clientId: string;
  active: boolean;
  reason: string | null;
  urgencyScore: number;
  triggers: string[];
  lastNotificationAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StartHandoverParams {
  conversationId: string;
  clientId: string;
  reason: string;
  urgencyScore: number;
  triggers: string[];
}

export class HandoverManager {
  /**
   * Start a handover - create HandoverState record
   */
  static async startHandover(params: StartHandoverParams): Promise<HandoverState> {
    const { conversationId, clientId, reason, urgencyScore, triggers } = params;

    // Check if handover already exists
    const existing = await prisma.handoverState.findUnique({
      where: { conversationId },
    });

    if (existing) {
      // Update existing handover
      const updated = await prisma.handoverState.update({
        where: { conversationId },
        data: {
          active: true,
          reason,
          urgencyScore,
          triggers,
          updatedAt: new Date(),
        },
      });

      return updated as HandoverState;
    }

    // Create new handover
    const handover = await prisma.handoverState.create({
      data: {
        conversationId,
        clientId,
        active: true,
        reason,
        urgencyScore,
        triggers,
        lastNotificationAt: null,
      },
    });

    // PHASE 13: Broadcast new handover event
    WebSocketGateway.broadcastToClient(clientId, 'NEW_HANDOVER', {
      handoverId: handover.id,
      conversationId,
      reason,
      urgencyScore,
      triggers,
    });

    return handover as HandoverState;
  }

  /**
   * End a handover - mark inactive
   */
  static async endHandover(conversationId: string): Promise<void> {
    // Get the handover before updating to get clientId
    const handover = await prisma.handoverState.findFirst({
      where: { conversationId, active: true },
    });

    await prisma.handoverState.updateMany({
      where: { conversationId, active: true },
      data: {
        active: false,
        updatedAt: new Date(),
      },
    });

    // PHASE 13: Broadcast handover resolved event
    if (handover) {
      WebSocketGateway.broadcastToClient(handover.clientId, 'HANDOVER_RESOLVED', {
        handoverId: handover.id,
        conversationId,
      });
    }
  }

  /**
   * Check if conversation is in active handover
   */
  static async isInHandover(conversationId: string): Promise<boolean> {
    const handover = await prisma.handoverState.findFirst({
      where: {
        conversationId,
        active: true,
      },
    });

    return handover !== null;
  }

  /**
   * Get handover state for conversation
   */
  static async getHandoverState(conversationId: string): Promise<HandoverState | null> {
    const handover = await prisma.handoverState.findFirst({
      where: {
        conversationId,
        active: true,
      },
    });

    return handover as HandoverState | null;
  }

  /**
   * Check if notification should be sent (throttle to prevent spam)
   * Returns true if notification should be sent
   */
  static async shouldNotify(conversationId: string): Promise<boolean> {
    const handover = await this.getHandoverState(conversationId);

    if (!handover) {
      return true; // No handover exists, should notify
    }

    if (!handover.lastNotificationAt) {
      return true; // Never notified before, should notify
    }

    // Throttle: only notify if last notification was > 5 minutes ago
    const THROTTLE_MINUTES = 5;
    const now = new Date();
    const lastNotified = new Date(handover.lastNotificationAt);
    const minutesSinceLastNotification =
      (now.getTime() - lastNotified.getTime()) / 1000 / 60;

    return minutesSinceLastNotification >= THROTTLE_MINUTES;
  }

  /**
   * Mark that notification was sent
   */
  static async markNotified(conversationId: string): Promise<void> {
    await prisma.handoverState.updateMany({
      where: { conversationId, active: true },
      data: {
        lastNotificationAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get all active handovers for a client
   */
  static async getActiveHandovers(clientId: string): Promise<HandoverState[]> {
    const handovers = await prisma.handoverState.findMany({
      where: {
        clientId,
        active: true,
      },
      orderBy: {
        urgencyScore: 'desc', // Highest urgency first
      },
    });

    return handovers as HandoverState[];
  }

  /**
   * Get handover count for client
   */
  static async getActiveHandoverCount(clientId: string): Promise<number> {
    return await prisma.handoverState.count({
      where: {
        clientId,
        active: true,
      },
    });
  }

  /**
   * Get all handovers (active + inactive) for conversation
   */
  static async getConversationHistory(conversationId: string): Promise<HandoverState[]> {
    const handovers = await prisma.handoverState.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
    });

    return handovers as HandoverState[];
  }

  /**
   * Close all active handovers for client (emergency use)
   */
  static async closeAllHandovers(clientId: string): Promise<number> {
    const result = await prisma.handoverState.updateMany({
      where: {
        clientId,
        active: true,
      },
      data: {
        active: false,
        updatedAt: new Date(),
      },
    });

    return result.count;
  }
}
