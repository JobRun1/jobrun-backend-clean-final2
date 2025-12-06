/**
 * Route inbound SMS message
 */
export declare function routeInboundSMS(params: {
    clientId: string;
    from: string;
    to: string;
    body: string;
    twilioSid: string;
}): Promise<void>;
/**
 * Route missed call event
 */
export declare function routeMissedCall(params: {
    clientId: string;
    from: string;
    to: string;
    callSid: string;
    callStatus: string;
}): Promise<void>;
/**
 * Get conversation history for a customer
 */
export declare function getConversationHistory(customerId: string): Promise<({
    id: string;
    createdAt: Date;
    updatedAt: Date;
    clientId: string;
    customerId: string | null;
} & {
    messages: import(".prisma/client").Message[];
})[]>;
//# sourceMappingURL=router.d.ts.map