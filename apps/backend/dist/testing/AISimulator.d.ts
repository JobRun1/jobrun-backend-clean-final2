/**
 * AISimulator - Local Testing Harness for AI Scheduling Engine
 * Simulates customer conversations without Twilio integration
 */
interface SimulatorOptions {
    baseUrl?: string;
    verbose?: boolean;
}
interface AISchedulingResponse {
    success: boolean;
    data?: {
        reply: string;
        proposedSlot: string | null;
        bookingCreated: boolean;
        bookingId?: string;
    };
    error?: {
        code: string;
        message: string;
    };
}
interface ConversationTurn {
    timestamp: Date;
    elapsedMs: number;
    userMessage: string;
    aiReply: string;
    proposedSlot?: string;
    bookingCreated: boolean;
    bookingId?: string;
}
interface TestResult {
    passed: boolean;
    bookingCreated: boolean;
    totalMessages: number;
    totalElapsedMs: number;
    transcript: ConversationTurn[];
}
export declare class AISimulator {
    private conversationId;
    private clientId;
    private customerName;
    private customerPhone;
    private baseUrl;
    private verbose;
    private startTime;
    private transcript;
    constructor(clientId: string, name: string, phone: string, options?: SimulatorOptions);
    /**
     * Send a message to the AI scheduling engine
     */
    send(message: string): Promise<AISchedulingResponse>;
    /**
     * Send multiple messages in sequence with optional repeat
     */
    sendSequence(messages: string[], repeatCount?: number): Promise<TestResult>;
    /**
     * Get database state - fetch bookings for this customer
     */
    getDatabaseState(): Promise<any>;
    /**
     * Print database snapshot after test
     */
    printDatabaseSnapshot(): Promise<void>;
    /**
     * Export conversation transcript to file
     */
    exportTranscript(outputPath?: string): Promise<string>;
    /**
     * Get conversation transcript
     */
    getTranscript(): ConversationTurn[];
    /**
     * Format elapsed time
     */
    private formatElapsed;
    /**
     * Format date/time for display
     */
    private formatDateTime;
    /**
     * Delay helper for sequential messages
     */
    private delay;
    /**
     * Get current conversation ID
     */
    getConversationId(): string;
    /**
     * Reset to new conversation
     */
    reset(): void;
}
export {};
//# sourceMappingURL=AISimulator.d.ts.map