/**
 * Predictive Load Agent (AUTOMATION TIER #14)
 * Predicts busy/quiet weeks based on patterns
 */
import { BaseAgent } from '../base/BaseAgent';
import type { AgentContext, AgentOutput } from '../base/types';
export declare class PredictiveLoadAgent extends BaseAgent {
    constructor();
    execute(context: AgentContext): Promise<AgentOutput>;
}
//# sourceMappingURL=PredictiveLoadAgent.d.ts.map