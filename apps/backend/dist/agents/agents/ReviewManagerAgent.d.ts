/**
 * Review Manager Agent (AUTOMATION TIER #15)
 * Requests reviews after job completion
 */
import { BaseAgent } from '../base/BaseAgent';
import type { AgentContext, AgentOutput } from '../base/types';
export declare class ReviewManagerAgent extends BaseAgent {
    constructor();
    execute(context: AgentContext): Promise<AgentOutput>;
}
//# sourceMappingURL=ReviewManagerAgent.d.ts.map