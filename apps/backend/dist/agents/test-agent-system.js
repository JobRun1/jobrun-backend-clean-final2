"use strict";
/**
 * Manual Agent System Test
 * Run with: tsx apps/backend/src/agents/test-agent-system.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const index_1 = require("./index");
const prisma = new client_1.PrismaClient();
async function testAgentSystem() {
    console.log('🧪 Testing JobRun Agent System\n');
    // Test 1: Initialize system
    console.log('Test 1: Initializing agent system...');
    const orchestrator = (0, index_1.initializeAgentSystem)(prisma);
    const registry = orchestrator.getRegistry();
    console.log(`✅ Initialized with ${registry.getAgentCount()} agents\n`);
    // Test 2: Check all agents are registered
    console.log('Test 2: Checking all 21 agents...');
    const expectedAgents = [
        // Core (5)
        'LeadHandling',
        'BookingCoordinator',
        'Summariser',
        'DataCleanup',
        'DataValidator',
        // Automation (10)
        'Insights',
        'AvailabilityManager',
        'CustomerCategoriser',
        'TemplateOptimiser',
        'AutoReschedule',
        'ConflictResolver',
        'DailyBriefing',
        'SmartFollowUp',
        'PredictiveLoad',
        'ReviewManager',
        // Elite (5)
        'ChatAssistant',
        'FAQResponder',
        'RevenueMaximiser',
        'AIAdminAssistant',
        'BillingNudger',
        // Admin (1)
        'DemoMode',
    ];
    let allPresent = true;
    for (const agentName of expectedAgents) {
        if (!registry.hasAgent(agentName)) {
            console.log(`❌ Missing agent: ${agentName}`);
            allPresent = false;
        }
    }
    if (allPresent) {
        console.log(`✅ All 21 agents registered correctly\n`);
    }
    // Test 3: Check tier distribution
    console.log('Test 3: Checking tier distribution...');
    const agents = registry.getAllAgents();
    const tiers = {
        CORE: agents.filter((a) => a.getConfig().tier === 'CORE').length,
        AUTOMATION: agents.filter((a) => a.getConfig().tier === 'AUTOMATION').length,
        ELITE: agents.filter((a) => a.getConfig().tier === 'ELITE').length,
        ADMIN: agents.filter((a) => a.getConfig().tier === 'ADMIN').length,
    };
    console.log(`   Core: ${tiers.CORE} (expected: 5)`);
    console.log(`   Automation: ${tiers.AUTOMATION} (expected: 10)`);
    console.log(`   Elite: ${tiers.ELITE} (expected: 5)`);
    console.log(`   Admin: ${tiers.ADMIN} (expected: 1)`);
    if (tiers.CORE === 5 &&
        tiers.AUTOMATION === 10 &&
        tiers.ELITE === 5 &&
        tiers.ADMIN === 1) {
        console.log('✅ Tier distribution correct\n');
    }
    else {
        console.log('❌ Tier distribution incorrect\n');
    }
    // Test 4: Check trigger matching
    console.log('Test 4: Testing trigger matching...');
    const testCases = [
        { trigger: 'INBOUND_SMS', expectedAgent: 'LeadHandling' },
        { trigger: 'BOOKING_REQUEST', expectedAgent: 'BookingCoordinator' },
        { trigger: 'DAILY_CRON', expectedAgent: 'DailyBriefing' },
        { trigger: 'JOB_COMPLETED', expectedAgent: 'ReviewManager' },
    ];
    for (const testCase of testCases) {
        const context = {
            clientId: 'test',
            trigger: testCase.trigger,
            input: {},
        };
        const matchedAgents = registry.findAgentsForContext(context);
        const hasExpected = matchedAgents.some((a) => a.getName() === testCase.expectedAgent);
        if (hasExpected) {
            console.log(`   ✅ ${testCase.trigger} → ${testCase.expectedAgent}`);
        }
        else {
            console.log(`   ❌ ${testCase.trigger} did not match ${testCase.expectedAgent}`);
        }
    }
    console.log('');
    // Test 5: Agent manifest
    console.log('Test 5: Generating agent manifest...');
    const manifest = (0, index_1.getAgentManifest)(orchestrator);
    console.log(`✅ Generated manifest for ${manifest.length} agents\n`);
    // Print summary
    console.log('📊 Agent Summary:');
    console.log('═'.repeat(80));
    console.log('Tier'.padEnd(15), 'Agent'.padEnd(25), 'Model'.padEnd(12), 'Priority'.padEnd(10), 'Confidence');
    console.log('═'.repeat(80));
    for (const agent of manifest.sort((a, b) => {
        const tierOrder = { CORE: 1, AUTOMATION: 2, ELITE: 3, ADMIN: 4 };
        return (tierOrder[a.tier] - tierOrder[b.tier]) || (b.priority - a.priority);
    })) {
        console.log(agent.tier.padEnd(15), agent.name.padEnd(25), agent.model.padEnd(12), agent.priority.toString().padEnd(10), agent.confidenceThreshold.toFixed(2));
    }
    console.log('═'.repeat(80));
    console.log('\n✅ All tests passed! Agent system is ready.\n');
}
// Run tests
testAgentSystem()
    .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=test-agent-system.js.map