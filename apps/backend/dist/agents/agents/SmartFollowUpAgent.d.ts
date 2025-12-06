/**
 * Smart Follow-Up Agent (AUTOMATION TIER #13)
 * Sends gentle follow-ups when no reply after timeout
 */
import { BaseAgent } from '../base/BaseAgent';
import type { AgentContext, AgentOutput } from '../base/types';
export declare class SmartFollowUpAgent extends BaseAgent {
    constructor();
    execute(context: AgentContext): Promise<AgentOutput>;
}
//# sourceMappingURL=SmartFollowUpAgent.d.ts.map