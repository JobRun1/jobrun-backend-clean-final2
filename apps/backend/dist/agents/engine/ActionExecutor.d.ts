/**
 * ActionExecutor - Executes structured actions from agents
 */
import { PrismaClient } from '@prisma/client';
import type { AgentAction, AgentContext } from '../base/types';
export declare class ActionExecutor {
    private prisma;
    constructor(prisma: PrismaClient);
    /**
     * Execute an action
     */
    executeAction(action: AgentAction, context: AgentContext): Promise<{
        success: boolean;
        result?: any;
        error?: string;
    }>;
    /**
     * Execute multiple actions in sequence
     */
    executeActions(actions: AgentAction[], context: AgentContext): Promise<Array<{
        success: boolean;
        result?: any;
        error?: string;
    }>>;
    private executeSendMessage;
    private executeCreateBooking;
    private executeUpdateBooking;
    private executeCancelBooking;
    private executeSuggestSlots;
    private executeAskForDetails;
    private executeUpdateCustomer;
    private executeCreateLead;
    private executeUpdateLead;
    private executeLogInsight;
    private executeSendNotification;
    private executeCreateTask;
    private executeRequestReview;
    private executeSendPaymentReminder;
    private executeGenerateReport;
    private executeUpdateSettings;
    private executeCreateDemoData;
}
//# sourceMappingURL=ActionExecutor.d.ts.map