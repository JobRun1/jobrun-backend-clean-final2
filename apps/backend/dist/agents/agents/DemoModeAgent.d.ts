/**
 * Demo Mode Agent (ADMIN TIER #21)
 * Creates simulated bookings, messages, customers for demos
 */
import { BaseAgent } from '../base/BaseAgent';
import type { AgentContext, AgentOutput } from '../base/types';
export declare class DemoModeAgent extends BaseAgent {
    constructor();
    execute(context: AgentContext): Promise<AgentOutput>;
}
//# sourceMappingURL=DemoModeAgent.d.ts.map