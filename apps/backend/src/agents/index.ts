/**
 * Agent System Initialization
 * Registers all 21 JobRun agents with the Orchestrator
 */

import { PrismaClient } from '@prisma/client';
import { Orchestrator } from './engine/Orchestrator';

// Import all agents
import { LeadHandlingAgent } from './agents/LeadHandlingAgent';
import { BookingCoordinatorAgent } from './agents/BookingCoordinatorAgent';
import { SummariserAgent } from './agents/SummariserAgent';
import { DataCleanupAgent } from './agents/DataCleanupAgent';
import { DataValidatorAgent } from './agents/DataValidatorAgent';
import { InsightsAgent } from './agents/InsightsAgent';
import { AvailabilityManagerAgent } from './agents/AvailabilityManagerAgent';
import { CustomerCategoriserAgent } from './agents/CustomerCategoriserAgent';
import { TemplateOptimiserAgent } from './agents/TemplateOptimiserAgent';
import { AutoRescheduleAgent } from './agents/AutoRescheduleAgent';
import { ConflictResolverAgent } from './agents/ConflictResolverAgent';
import { DailyBriefingAgent } from './agents/DailyBriefingAgent';
import { SmartFollowUpAgent } from './agents/SmartFollowUpAgent';
import { PredictiveLoadAgent } from './agents/PredictiveLoadAgent';
import { ReviewManagerAgent } from './agents/ReviewManagerAgent';
import { ChatAssistantAgent } from './agents/ChatAssistantAgent';
import { FAQResponderAgent } from './agents/FAQResponderAgent';
import { RevenueMaximiserAgent } from './agents/RevenueMaximiserAgent';
import { AIAdminAssistantAgent } from './agents/AIAdminAssistantAgent';
import { BillingNudgerAgent } from './agents/BillingNudgerAgent';
import { DemoModeAgent } from './agents/DemoModeAgent';

/**
 * Initialize and configure the agent system
 */
export function initializeAgentSystem(prisma: PrismaClient): Orchestrator {
  const orchestrator = new Orchestrator(prisma);
  const registry = orchestrator.getRegistry();

  // Register Core Tier Agents (1-5)
  registry.register(new LeadHandlingAgent());
  registry.register(new BookingCoordinatorAgent());
  registry.register(new SummariserAgent());
  registry.register(new DataCleanupAgent());
  registry.register(new DataValidatorAgent());

  // Register Automation Tier Agents (6-15)
  registry.register(new InsightsAgent());
  registry.register(new AvailabilityManagerAgent());
  registry.register(new CustomerCategoriserAgent());
  registry.register(new TemplateOptimiserAgent());
  registry.register(new AutoRescheduleAgent());
  registry.register(new ConflictResolverAgent());
  registry.register(new DailyBriefingAgent());
  registry.register(new SmartFollowUpAgent());
  registry.register(new PredictiveLoadAgent());
  registry.register(new ReviewManagerAgent());

  // Register Elite Tier Agents (16-20)
  registry.register(new ChatAssistantAgent());
  registry.register(new FAQResponderAgent());
  registry.register(new RevenueMaximiserAgent());
  registry.register(new AIAdminAssistantAgent());
  registry.register(new BillingNudgerAgent());

  // Register Admin Tier Agent (21)
  registry.register(new DemoModeAgent());

  console.log(`✅ Agent System Initialized: ${registry.getAgentCount()} agents registered`);

  return orchestrator;
}

/**
 * Get list of all registered agents with metadata
 */
export function getAgentManifest(orchestrator: Orchestrator) {
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

// Export types for external use
export type { AgentContext, AgentOutput, AgentAction } from './base/types';
export type { OrchestrationResult } from './engine/Orchestrator';
export { Orchestrator } from './engine/Orchestrator';
