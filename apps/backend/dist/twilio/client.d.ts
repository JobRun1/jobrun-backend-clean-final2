import twilio from 'twilio';
export declare function getTwilioClient(): twilio.Twilio;
/**
 * Send SMS via Twilio
 */
export declare function sendSMS(to: string, from: string, body: string): Promise<string>;
/**
 * Get Twilio auth token for signature validation
 */
export declare function getTwilioAuthToken(): string;
//# sourceMappingURL=client.d.ts.map