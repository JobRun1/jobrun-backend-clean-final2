/**
 * AgentService - High-level service for agent operations
 * Bridges between application code and agent system
 */
import { PrismaClient } from '@prisma/client';
export declare class AgentService {
    private orchestrator;
    private prisma;
    constructor(prisma: PrismaClient);
    /**
     * Process an inbound SMS message
     */
    processInboundSMS(params: {
        clientId: string;
        customerId: string;
        conversationId: string;
        message: string;
        customerPhone: string;
    }): Promise<import("./index").OrchestrationResult>;
    /**
     * Process a booking request
     */
    processBookingRequest(params: {
        clientId: string;
        customerId: string;
        conversationId?: string;
        message?: string;
    }): Promise<import("./index").OrchestrationResult>;
    /**
     * Run daily briefing for a client
     */
    runDailyBriefing(clientId: string): Promise<import("./index").OrchestrationResult>;
    /**
     * Run weekly insights for a client
     */
    runWeeklyInsights(clientId: string): Promise<import("./index").OrchestrationResult>;
    /**
     * Process job completion (trigger review request)
     */
    processJobCompletion(params: {
        clientId: string;
        customerId: string;
        bookingId: string;
    }): Promise<import("./index").OrchestrationResult>;
    /**
     * Handle calendar conflict
     */
    handleCalendarConflict(params: {
        clientId: string;
        bookingId: string;
        conflictData: any;
    }): Promise<import("./index").OrchestrationResult>;
    /**
     * Generate demo data
     */
    generateDemoData(clientId: string, options?: {
        volume?: 'light' | 'standard' | 'full';
    }): Promise<import("./index").OrchestrationResult>;
    /**
     * Get agent analytics
     */
    getAgentAnalytics(agentName: string, clientId: string, days?: number): Promise<{
        agentName: string;
        period: string;
        totalExecutions: number;
        successfulExecutions: number;
        failedExecutions: number;
        successRate: number;
        avgExecutionTimeMs: number;
    }>;
    /**
     * Cleanup background tasks
     */
    cleanup(): Promise<void>;
}
//# sourceMappingURL=AgentService.d.ts.map