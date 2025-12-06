/**
 * Booking Coordinator Agent (CORE TIER #2)
 * Handles booking requests, changes, and rescheduling
 */
import { BaseAgent } from '../base/BaseAgent';
import type { AgentContext, AgentOutput } from '../base/types';
export declare class BookingCoordinatorAgent extends BaseAgent {
    constructor();
    execute(context: AgentContext): Promise<AgentOutput>;
}
//# sourceMappingURL=BookingCoordinatorAgent.d.ts.map