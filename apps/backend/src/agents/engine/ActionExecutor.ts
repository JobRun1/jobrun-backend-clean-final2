/**
 * ActionExecutor - Executes structured actions from agents
 */

import { PrismaClient } from '@prisma/client';
import type { AgentAction, AgentContext } from '../base/types';
import { addMessage } from '../../modules/conversation/service';

export class ActionExecutor {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Execute an action
   */
  async executeAction(
    action: AgentAction,
    context: AgentContext
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      switch (action.type) {
        case 'SEND_MESSAGE':
          return await this.executeSendMessage(action, context);

        case 'CREATE_BOOKING':
          return await this.executeCreateBooking(action, context);

        case 'UPDATE_BOOKING':
          return await this.executeUpdateBooking(action, context);

        case 'CANCEL_BOOKING':
          return await this.executeCancelBooking(action, context);

        case 'SUGGEST_SLOTS':
          return await this.executeSuggestSlots(action, context);

        case 'ASK_FOR_DETAILS':
          return await this.executeAskForDetails(action, context);

        case 'UPDATE_CUSTOMER':
          return await this.executeUpdateCustomer(action, context);

        case 'CREATE_LEAD':
          return await this.executeCreateLead(action, context);

        case 'UPDATE_LEAD':
          return await this.executeUpdateLead(action, context);

        case 'LOG_INSIGHT':
          return await this.executeLogInsight(action, context);

        case 'SEND_NOTIFICATION':
          return await this.executeSendNotification(action, context);

        case 'CREATE_TASK':
          return await this.executeCreateTask(action, context);

        case 'REQUEST_REVIEW':
          return await this.executeRequestReview(action, context);

        case 'SEND_PAYMENT_REMINDER':
          return await this.executeSendPaymentReminder(action, context);

        case 'GENERATE_REPORT':
          return await this.executeGenerateReport(action, context);

        case 'UPDATE_SETTINGS':
          return await this.executeUpdateSettings(action, context);

        case 'CREATE_DEMO_DATA':
          return await this.executeCreateDemoData(action, context);

        case 'NO_ACTION':
          return { success: true, result: 'No action required' };

        default:
          return {
            success: false,
            error: `Unknown action type: ${action.type}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute multiple actions in sequence
   */
  async executeActions(
    actions: AgentAction[],
    context: AgentContext
  ): Promise<Array<{ success: boolean; result?: any; error?: string }>> {
    const results = [];
    for (const action of actions) {
      const result = await this.executeAction(action, context);
      results.push(result);
      // Stop on first failure
      if (!result.success) {
        break;
      }
    }
    return results;
  }

  // Action implementations

  private async executeSendMessage(action: AgentAction, context: AgentContext) {
    const { message, to } = action.payload;

    if (!context.conversationId) {
      throw new Error('conversationId is required to send message');
    }

    if (!context.customerId) {
      throw new Error('customerId is required to send message');
    }

    // Use conversation service to ensure foreign key constraints
    const result = await addMessage({
      conversationId: context.conversationId,
      clientId: context.clientId,
      customerId: context.customerId,
      direction: 'OUTBOUND',
      type: 'SMS',
      body: message,
    });

    return { success: true, result };
  }

  private async executeCreateBooking(action: AgentAction, context: AgentContext) {
    const { customerId, serviceType, startTime, endTime, notes } = action.payload;

    const targetCustomerId = customerId || context.customerId;

    if (!targetCustomerId) {
      throw new Error('customerId is required for booking');
    }

    const customerExists = await this.prisma.customer.findUnique({
      where: { id: targetCustomerId },
      select: { id: true },
    });

    if (!customerExists) {
      throw new Error(`Customer ${targetCustomerId} does not exist`);
    }

    const result = await this.prisma.booking.create({
      data: {
        clientId: context.clientId,
        customerId: targetCustomerId,
        start: new Date(startTime),
        end: new Date(endTime),
        status: 'NEW',
        notes,
      },
    });

    return { success: true, result };
  }

  private async executeUpdateBooking(action: AgentAction, context: AgentContext) {
    const { bookingId, updates } = action.payload;

    const result = await this.prisma.booking.update({
      where: { id: bookingId || context.bookingId! },
      data: updates,
    });

    return { success: true, result };
  }

  private async executeCancelBooking(action: AgentAction, context: AgentContext) {
    const { bookingId, reason } = action.payload;

    const result = await this.prisma.booking.update({
      where: { id: bookingId || context.bookingId! },
      data: {
        status: 'CANCELLED',
        notes: reason,
      },
    });

    return { success: true, result };
  }

  private async executeSuggestSlots(action: AgentAction, context: AgentContext) {
    // This returns data but doesn't persist - just formats available slots
    const { slots } = action.payload;
    return { success: true, result: { slots } };
  }

  private async executeAskForDetails(action: AgentAction, context: AgentContext) {
    // Send message asking for more information
    return this.executeSendMessage(
      {
        type: 'SEND_MESSAGE',
        payload: { message: action.payload.message },
      },
      context
    );
  }

  private async executeUpdateCustomer(action: AgentAction, context: AgentContext) {
    const { customerId, updates } = action.payload;

    const targetCustomerId = customerId || context.customerId;

    if (!targetCustomerId) {
      throw new Error('customerId is required for customer update');
    }

    const result = await this.prisma.customer.update({
      where: { id: targetCustomerId },
      data: updates,
    });

    return { success: true, result };
  }

  private async executeCreateLead(action: AgentAction, context: AgentContext) {
    const { phone, name, notes } = action.payload;

    // Create or find customer first (Lead requires customerId)
    const customer = await this.prisma.customer.upsert({
      where: {
        clientId_phone: {
          clientId: context.clientId,
          phone: phone || 'unknown',
        },
      },
      update: name ? { name } : {},
      create: {
        clientId: context.clientId,
        phone: phone || 'unknown',
        name: name || null,
        state: 'NEW',
      },
    });

    // Then create lead linked to customer
    const result = await this.prisma.lead.create({
      data: {
        clientId: context.clientId,
        customerId: customer.id,
        state: 'NEW',
        jobType: '',
        urgency: '',
        location: '',
        requestedTime: '',
        notes: notes || '',
      },
    });

    return { success: true, result };
  }

  private async executeUpdateLead(action: AgentAction, context: AgentContext) {
    const { leadId, updates } = action.payload;

    const result = await this.prisma.lead.update({
      where: { id: leadId },
      data: updates,
    });

    return { success: true, result };
  }

  private async executeLogInsight(action: AgentAction, context: AgentContext) {
    const { category, insight, data } = action.payload;

    // Store in a generic insights table or log
    console.log(`[INSIGHT] ${category}: ${insight}`, data);
    return { success: true, result: { category, insight, data } };
  }

  private async executeSendNotification(action: AgentAction, context: AgentContext) {
    // Similar to send message but for admin notifications
    const { message, type } = action.payload;
    console.log(`[NOTIFICATION] ${type}: ${message}`);
    return { success: true, result: { type, message } };
  }

  private async executeCreateTask(action: AgentAction, context: AgentContext) {
    const { title, description, dueDate } = action.payload;

    // Could create a Task model or just log for now
    console.log(`[TASK] ${title}: ${description}`, { dueDate });
    return { success: true, result: { title, description, dueDate } };
  }

  private async executeRequestReview(action: AgentAction, context: AgentContext) {
    const { message } = action.payload;

    return this.executeSendMessage(
      {
        type: 'SEND_MESSAGE',
        payload: { message },
      },
      context
    );
  }

  private async executeSendPaymentReminder(action: AgentAction, context: AgentContext) {
    const { message, amount } = action.payload;

    return this.executeSendMessage(
      {
        type: 'SEND_MESSAGE',
        payload: { message },
      },
      context
    );
  }

  private async executeGenerateReport(action: AgentAction, context: AgentContext) {
    const { reportType, data } = action.payload;

    console.log(`[REPORT] ${reportType}`, data);
    return { success: true, result: { reportType, data } };
  }

  private async executeUpdateSettings(action: AgentAction, context: AgentContext) {
    const { updates } = action.payload;

    const result = await this.prisma.clientSettings.update({
      where: { clientId: context.clientId },
      data: updates,
    });

    return { success: true, result };
  }

  private async executeCreateDemoData(action: AgentAction, context: AgentContext) {
    const { dataType, count } = action.payload;

    console.log(`[DEMO] Creating ${count} ${dataType} records`);
    // Implementation depends on data type
    return { success: true, result: { dataType, count } };
  }
}
