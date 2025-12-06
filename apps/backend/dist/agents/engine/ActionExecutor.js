"use strict";
/**
 * ActionExecutor - Executes structured actions from agents
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionExecutor = void 0;
class ActionExecutor {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Execute an action
     */
    async executeAction(action, context) {
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Execute multiple actions in sequence
     */
    async executeActions(actions, context) {
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
    async executeSendMessage(action, context) {
        const { message, to } = action.payload;
        const result = await this.prisma.message.create({
            data: {
                clientId: context.clientId,
                conversationId: context.conversationId,
                customerId: context.customerId,
                direction: 'OUTBOUND',
                type: 'SMS',
                body: message,
            },
        });
        return { success: true, result };
    }
    async executeCreateBooking(action, context) {
        const { customerId, serviceType, startTime, endTime, notes } = action.payload;
        const result = await this.prisma.booking.create({
            data: {
                clientId: context.clientId,
                customerId: customerId || context.customerId,
                start: new Date(startTime),
                end: new Date(endTime),
                status: 'NEW',
                notes,
            },
        });
        return { success: true, result };
    }
    async executeUpdateBooking(action, context) {
        const { bookingId, updates } = action.payload;
        const result = await this.prisma.booking.update({
            where: { id: bookingId || context.bookingId },
            data: updates,
        });
        return { success: true, result };
    }
    async executeCancelBooking(action, context) {
        const { bookingId, reason } = action.payload;
        const result = await this.prisma.booking.update({
            where: { id: bookingId || context.bookingId },
            data: {
                status: 'CANCELLED',
                notes: reason,
            },
        });
        return { success: true, result };
    }
    async executeSuggestSlots(action, context) {
        // This returns data but doesn't persist - just formats available slots
        const { slots } = action.payload;
        return { success: true, result: { slots } };
    }
    async executeAskForDetails(action, context) {
        // Send message asking for more information
        return this.executeSendMessage({
            type: 'SEND_MESSAGE',
            payload: { message: action.payload.message },
        }, context);
    }
    async executeUpdateCustomer(action, context) {
        const { customerId, updates } = action.payload;
        const result = await this.prisma.customer.update({
            where: { id: customerId || context.customerId },
            data: updates,
        });
        return { success: true, result };
    }
    async executeCreateLead(action, context) {
        const { phone, name, source, notes } = action.payload;
        const result = await this.prisma.lead.create({
            data: {
                clientId: context.clientId,
                phone,
                name,
                source: source || 'INBOUND',
                status: 'NEW',
                notes,
            },
        });
        return { success: true, result };
    }
    async executeUpdateLead(action, context) {
        const { leadId, updates } = action.payload;
        const result = await this.prisma.lead.update({
            where: { id: leadId },
            data: updates,
        });
        return { success: true, result };
    }
    async executeLogInsight(action, context) {
        const { category, insight, data } = action.payload;
        // Store in a generic insights table or log
        console.log(`[INSIGHT] ${category}: ${insight}`, data);
        return { success: true, result: { category, insight, data } };
    }
    async executeSendNotification(action, context) {
        // Similar to send message but for admin notifications
        const { message, type } = action.payload;
        console.log(`[NOTIFICATION] ${type}: ${message}`);
        return { success: true, result: { type, message } };
    }
    async executeCreateTask(action, context) {
        const { title, description, dueDate } = action.payload;
        // Could create a Task model or just log for now
        console.log(`[TASK] ${title}: ${description}`, { dueDate });
        return { success: true, result: { title, description, dueDate } };
    }
    async executeRequestReview(action, context) {
        const { message } = action.payload;
        return this.executeSendMessage({
            type: 'SEND_MESSAGE',
            payload: { message },
        }, context);
    }
    async executeSendPaymentReminder(action, context) {
        const { message, amount } = action.payload;
        return this.executeSendMessage({
            type: 'SEND_MESSAGE',
            payload: { message },
        }, context);
    }
    async executeGenerateReport(action, context) {
        const { reportType, data } = action.payload;
        console.log(`[REPORT] ${reportType}`, data);
        return { success: true, result: { reportType, data } };
    }
    async executeUpdateSettings(action, context) {
        const { updates } = action.payload;
        const result = await this.prisma.clientSettings.update({
            where: { clientId: context.clientId },
            data: updates,
        });
        return { success: true, result };
    }
    async executeCreateDemoData(action, context) {
        const { dataType, count } = action.payload;
        console.log(`[DEMO] Creating ${count} ${dataType} records`);
        // Implementation depends on data type
        return { success: true, result: { dataType, count } };
    }
}
exports.ActionExecutor = ActionExecutor;
//# sourceMappingURL=ActionExecutor.js.map