/**
 * SchedulingHandler - API Handler for AI Scheduling
 * PHASE 10: Added safety wrapper and admin logging
 * Connects Twilio inbound messages → AI Brain → outbound response
 * Creates bookings when confirmed
 */

import { prisma } from '../db';
import { SchedulingBrain, SchedulingRequest, SchedulingResponse } from './SchedulingBrain';
import { AdminLogger } from './AdminLogger';
import { MessageTemplates } from './MessageTemplates';
import { HandoverManager } from './HandoverManager';
import { WebSocketGateway } from '../realtime/WebSocketGateway';

export interface HandleSchedulingRequest {
  message: string;
  conversationId: string;
  clientId: string;
  customerPhone?: string;
  customerName?: string;
}

export interface HandleSchedulingResponse {
  reply: string;
  proposedSlot: Date | null;
  bookingCreated: boolean;
  bookingId?: string;
}

export class SchedulingHandler {
  /**
   * Main handler - process message and optionally create booking
   * PHASE 10: Added safety wrapper and admin logging
   */
  static async handle(request: HandleSchedulingRequest): Promise<HandleSchedulingResponse> {
    const { message, conversationId, clientId, customerPhone, customerName } = request;

    // Get client's default booking duration (fallback to 60 minutes)
    const defaultDurationMinutes = 60; // TODO: Get from client settings

    try {
      // Process through AI brain (safety checks happen inside)
      const schedulingRequest: SchedulingRequest = {
        message,
        conversationId,
        clientId,
        defaultDurationMinutes,
      };

      const aiResponse: SchedulingResponse = await SchedulingBrain.process(schedulingRequest);

      // If booking should be created, create it
      let bookingCreated = false;
      let bookingId: string | undefined;

      // PHASE 11A: Prevent booking creation if in handover
      const isInHandover = await HandoverManager.isInHandover(conversationId);

      if (aiResponse.shouldBook && aiResponse.proposedSlot && !isInHandover) {
        try {
          const booking = await this.createBooking({
            clientId,
            customerPhone,
            customerName,
            start: aiResponse.proposedSlot,
            durationMinutes: defaultDurationMinutes,
          });

          bookingCreated = true;
          bookingId = booking.id;

          // PHASE 10: Log booking success
          AdminLogger.log('booking_created', conversationId, clientId, {
            bookingId: booking.id,
            slot: aiResponse.proposedSlot,
            customerPhone,
            customerName,
          });

          // PHASE 13: Broadcast booking created event
          WebSocketGateway.broadcastToClient(clientId, 'BOOKING_CREATED', {
            bookingId: booking.id,
            start: aiResponse.proposedSlot,
            end: new Date(aiResponse.proposedSlot.getTime() + defaultDurationMinutes * 60000),
            customerName,
            customerPhone,
          });
        } catch (error) {
          // PHASE 10: Log booking error
          AdminLogger.log('booking_error', conversationId, clientId, {
            error: String(error),
            slot: aiResponse.proposedSlot,
          });

          // PHASE 10: Return fallback message on booking error
          return {
            reply: MessageTemplates.fallback(),
            proposedSlot: null,
            bookingCreated: false,
            bookingId: undefined,
          };
        }
      } else if (isInHandover) {
        // PHASE 11A: Log that booking was blocked due to handover
        AdminLogger.log('booking_error', conversationId, clientId, {
          reason: 'in_handover',
          slot: aiResponse.proposedSlot,
        });
      }

      return {
        reply: aiResponse.reply,
        proposedSlot: aiResponse.proposedSlot,
        bookingCreated,
        bookingId,
      };
    } catch (error) {
      // PHASE 10: Catch any unexpected errors
      AdminLogger.log('error', conversationId, clientId, {
        error: String(error),
        context: 'SchedulingHandler.handle',
      });

      return {
        reply: MessageTemplates.fallback(),
        proposedSlot: null,
        bookingCreated: false,
        bookingId: undefined,
      };
    }
  }

  /**
   * Create a confirmed booking
   */
  private static async createBooking(params: {
    clientId: string;
    customerPhone?: string;
    customerName?: string;
    start: Date;
    durationMinutes: number;
  }): Promise<any> {
    const { clientId, customerPhone, customerName, start, durationMinutes } = params;

    const end = new Date(start.getTime() + durationMinutes * 60000);

    // Find or create customer
    let customerId: string | null = null;

    if (customerPhone) {
      let customer = await prisma.customer.findFirst({
        where: {
          clientId,
          phone: customerPhone,
        },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            clientId,
            phone: customerPhone,
            name: customerName || null,
            email: null,
          },
        });
      }

      customerId = customer.id;
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        clientId,
        customerId,
        start,
        end,
        status: 'CONFIRMED',
        customerName: customerName || null,
        notes: 'Booked via AI scheduling assistant',
      },
    });

    return booking;
  }

  /**
   * Get conversation history (for future enhancement)
   */
  static async getConversationHistory(conversationId: string): Promise<any[]> {
    // TODO: Implement conversation history storage
    // For now, return empty array
    return [];
  }

  /**
   * Save conversation message (for future enhancement)
   */
  static async saveMessage(params: {
    conversationId: string;
    message: string;
    sender: 'customer' | 'ai';
    timestamp: Date;
  }): Promise<void> {
    // TODO: Implement message storage
    // For now, just log
    console.log('Message saved:', params);
  }
}
