"use strict";
/**
 * Agent System Initialization
 * Registers all 21 JobRun agents with the Orchestrator
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Orchestrator = void 0;
exports.initializeAgentSystem = initializeAgentSystem;
exports.getAgentManifest = getAgentManifest;
const Orchestrator_1 = require("./engine/Orchestrator");
// Import all agents
const LeadHandlingAgent_1 = require("./agents/LeadHandlingAgent");
const BookingCoordinatorAgent_1 = require("./agents/BookingCoordinatorAgent");
const SummariserAgent_1 = require("./agents/SummariserAgent");
const DataCleanupAgent_1 = require("./agents/DataCleanupAgent");
const DataValidatorAgent_1 = require("./agents/DataValidatorAgent");
const InsightsAgent_1 = require("./agents/InsightsAgent");
const AvailabilityManagerAgent_1 = require("./agents/AvailabilityManagerAgent");
const CustomerCategoriserAgent_1 = require("./agents/CustomerCategoriserAgent");
const TemplateOptimiserAgent_1 = require("./agents/TemplateOptimiserAgent");
const AutoRescheduleAgent_1 = require("./agents/AutoRescheduleAgent");
const ConflictResolverAgent_1 = require("./agents/ConflictResolverAgent");
const DailyBriefingAgent_1 = require("./agents/DailyBriefingAgent");
const SmartFollowUpAgent_1 = require("./agents/SmartFollowUpAgent");
const PredictiveLoadAgent_1 = require("./agents/PredictiveLoadAgent");
const ReviewManagerAgent_1 = require("./agents/ReviewManagerAgent");
const ChatAssistantAgent_1 = require("./agents/ChatAssistantAgent");
const FAQResponderAgent_1 = require("./agents/FAQResponderAgent");
const RevenueMaximiserAgent_1 = require("./agents/RevenueMaximiserAgent");
const AIAdminAssistantAgent_1 = require("./agents/AIAdminAssistantAgent");
const BillingNudgerAgent_1 = require("./agents/BillingNudgerAgent");
const DemoModeAgent_1 = require("./agents/DemoModeAgent");
/**
 * Initialize and configure the agent system
 */
function initializeAgentSystem(prisma) {
    const orchestrator = new Orchestrator_1.Orchestrator(prisma);
    const registry = orchestrator.getRegistry();
    // Register Core Tier Agents (1-5)
    registry.register(new LeadHandlingAgent_1.LeadHandlingAgent());
    registry.register(new BookingCoordinatorAgent_1.BookingCoordinatorAgent());
    registry.register(new SummariserAgent_1.SummariserAgent());
    registry.register(new DataCleanupAgent_1.DataCleanupAgent());
    registry.register(new DataValidatorAgent_1.DataValidatorAgent());
    // Register Automation Tier Agents (6-15)
    registry.register(new InsightsAgent_1.InsightsAgent());
    registry.register(new AvailabilityManagerAgent_1.AvailabilityManagerAgent());
    registry.register(new CustomerCategoriserAgent_1.CustomerCategoriserAgent());
    registry.register(new TemplateOptimiserAgent_1.TemplateOptimiserAgent());
    registry.register(new AutoRescheduleAgent_1.AutoRescheduleAgent());
    registry.register(new ConflictResolverAgent_1.ConflictResolverAgent());
    registry.register(new DailyBriefingAgent_1.DailyBriefingAgent());
    registry.register(new SmartFollowUpAgent_1.SmartFollowUpAgent());
    registry.register(new PredictiveLoadAgent_1.PredictiveLoadAgent());
    registry.register(new ReviewManagerAgent_1.ReviewManagerAgent());
    // Register Elite Tier Agents (16-20)
    registry.register(new ChatAssistantAgent_1.ChatAssistantAgent());
    registry.register(new FAQResponderAgent_1.FAQResponderAgent());
    registry.register(new RevenueMaximiserAgent_1.RevenueMaximiserAgent());
    registry.register(new AIAdminAssistantAgent_1.AIAdminAssistantAgent());
    registry.register(new BillingNudgerAgent_1.BillingNudgerAgent());
    // Register Admin Tier Agent (21)
    registry.register(new DemoModeAgent_1.DemoModeAgent());
    console.log(`✅ Agent System Initialized: ${registry.getAgentCount()} agents registered`);
    return orchestrator;
}
/**
 * Get list of all registered agents with metadata
 */
function getAgentManifest(orchestrator) {
    const registry = orchestrator.getRegistry();
    const agents = registry.getAllAgents();
    return agents.map((agent) => {
        const config = agent.getConfig();
        return {
            name: config.name,
            tier: config.tier,
            triggers: config.triggers,
            priority: config.priority,
            enabled: config.enabled,
            model: config.llmConfig.model,
            confidenceThreshold: config.confidenceThreshold,
        };
    });
}
var Orchestrator_2 = require("./engine/Orchestrator");
Object.defineProperty(exports, "Orchestrator", { enumerable: true, get: function () { return Orchestrator_2.Orchestrator; } });
//# sourceMappingURL=index.js.map