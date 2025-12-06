import { Request } from 'express';
/**
 * Validate Twilio webhook signature
 * This ensures the request actually came from Twilio
 */
export declare function validateTwilioSignature(req: Request, authToken: string): boolean;
/**
 * Middleware wrapper for Twilio signature validation
 * Automatically bypasses validation in development, enforces in production
 */
export declare function twilioValidationMiddleware(authToken: string): (req: Request, res: any, next: any) => any;
//# sourceMappingURL=validateTwilioRequest.d.ts.map