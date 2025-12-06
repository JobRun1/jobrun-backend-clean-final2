"use strict";
/**
 * AgentService - High-level service for agent operations
 * Bridges between application code and agent system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentService = void 0;
const index_1 = require("./index");
class AgentService {
    orchestrator;
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
        this.orchestrator = (0, index_1.initializeAgentSystem)(prisma);
    }
    /**
     * Process an inbound SMS message
     */
    async processInboundSMS(params) {
        // Fetch context data
        const [customer, conversation, clientSettings] = await Promise.all([
            this.prisma.customer.findUnique({
                where: { id: params.customerId },
                include: {
                    bookings: {
                        orderBy: { createdAt: 'desc' },
                        take: 10,
                    },
                },
            }),
            this.prisma.conversation.findUnique({
                where: { id: params.conversationId },
                include: {
                    messages: {
                        orderBy: { createdAt: 'asc' },
                        take: 50,
                    },
                },
            }),
            this.prisma.clientSettings.findUnique({
                where: { clientId: params.clientId },
            }),
        ]);
        // Build agent context
        const context = {
            clientId: params.clientId,
            customerId: params.customerId,
            conversationId: params.conversationId,
            trigger: 'INBOUND_SMS',
            input: {
                message: params.message,
                metadata: {
                    phone: params.customerPhone,
                },
            },
            history: conversation?.messages.map((msg) => ({
                role: msg.direction === 'INBOUND' ? 'user' : 'assistant',
                content: msg.body,
                timestamp: msg.createdAt,
            })),
            clientSettings: clientSettings
                ? {
                    businessName: clientSettings.businessName || 'Business',
                    services: clientSettings.services || 'Services not configured',
                    availability: clientSettings.availability || 'Contact for availability',
                    pricing: clientSettings.pricing || 'Contact for pricing',
                }
                : undefined,
            customerData: customer
                ? {
                    name: customer.name || undefined,
                    phone: customer.phone,
                    email: customer.email || undefined,
                    previousBookings: customer.bookings.length,
                }
                : undefined,
        };
        // Process through agent system
        return await this.orchestrator.process(context);
    }
    /**
     * Process a booking request
     */
    async processBookingRequest(params) {
        const context = {
            clientId: params.clientId,
            customerId: params.customerId,
            conversationId: params.conversationId,
            trigger: 'BOOKING_REQUEST',
            input: {
                message: params.message,
            },
        };
        return await this.orchestrator.process(context);
    }
    /**
     * Run daily briefing for a client
     */
    async runDailyBriefing(clientId) {
        const context = {
            clientId,
            trigger: 'DAILY_CRON',
            input: {},
        };
        return await this.orchestrator.processWithAgent('DailyBriefing', context);
    }
    /**
     * Run weekly insights for a client
     */
    async runWeeklyInsights(clientId) {
        const context = {
            clientId,
            trigger: 'WEEKLY_CRON',
            input: {},
        };
        return await this.orchestrator.processWithAgent('Insights', context);
    }
    /**
     * Process job completion (trigger review request)
     */
    async processJobCompletion(params) {
        const context = {
            clientId: params.clientId,
            customerId: params.customerId,
            bookingId: params.bookingId,
            trigger: 'JOB_COMPLETED',
            input: {},
        };
        return await this.orchestrator.process(context);
    }
    /**
     * Handle calendar conflict
     */
    async handleCalendarConflict(params) {
        const context = {
            clientId: params.clientId,
            bookingId: params.bookingId,
            trigger: 'CALENDAR_CONFLICT',
            input: {
                metadata: params.conflictData,
            },
        };
        return await this.orchestrator.processWithAgent('ConflictResolver', context);
    }
    /**
     * Generate demo data
     */
    async generateDemoData(clientId, options) {
        const context = {
            clientId,
            trigger: 'ADMIN_ACTIVATION',
            input: {
                metadata: {
                    isAdmin: true,
                    demoOptions: options,
                },
            },
        };
        return await this.orchestrator.processWithAgent('DemoMode', context);
    }
    /**
     * Get agent analytics
     */
    async getAgentAnalytics(agentName, clientId, days = 7) {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const logs = await this.prisma.agentLog.findMany({
            where: {
                agentName,
                clientId,
                createdAt: {
                    gte: since,
                },
            },
        });
        const totalExecutions = logs.length;
        const successfulExecutions = logs.filter((log) => !log.error).length;
        const failedExecutions = logs.filter((log) => log.error).length;
        const avgExecutionTime = logs.reduce((sum, log) => sum + log.executionTimeMs, 0) / totalExecutions || 0;
        return {
            agentName,
            period: `Last ${days} days`,
            totalExecutions,
            successfulExecutions,
            failedExecutions,
            successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
            avgExecutionTimeMs: Math.round(avgExecutionTime),
        };
    }
    /**
     * Cleanup background tasks
     */
    async cleanup() {
        await this.orchestrator.cleanup();
    }
}
exports.AgentService = AgentService;
//# sourceMappingURL=AgentService.js.map