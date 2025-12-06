/**
 * Twilio webhook payload types
 */
export interface TwilioSMSPayload {
    MessageSid: string;
    AccountSid: string;
    From: string;
    To: string;
    Body: string;
    NumMedia?: string;
    [key: string]: string | undefined;
}
export interface TwilioCallStatusPayload {
    CallSid: string;
    AccountSid: string;
    From: string;
    To: string;
    CallStatus: TwilioCallStatus;
    Direction: 'inbound' | 'outbound-api' | 'outbound-dial';
    [key: string]: string | undefined;
}
export type TwilioCallStatus = 'queued' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'failed' | 'no-answer' | 'canceled';
export interface TwilioVoicePayload {
    CallSid: string;
    AccountSid: string;
    From: string;
    To: string;
    CallStatus: string;
    [key: string]: string | undefined;
}
//# sourceMappingURL=twilioTypes.d.ts.map