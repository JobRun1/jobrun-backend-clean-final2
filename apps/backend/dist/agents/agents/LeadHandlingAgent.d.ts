/**
 * Lead Handling Agent (CORE TIER #1)
 * Handles inbound SMS and missed calls, qualifies leads
 */
import { BaseAgent } from '../base/BaseAgent';
import type { AgentContext, AgentOutput } from '../base/types';
export declare class LeadHandlingAgent extends BaseAgent {
    constructor();
    execute(context: AgentContext): Promise<AgentOutput>;
}
//# sourceMappingURL=LeadHandlingAgent.d.ts.map