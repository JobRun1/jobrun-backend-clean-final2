import { Request } from 'express';
import crypto from 'crypto';

/**
 * Validate Twilio webhook signature
 * This ensures the request actually came from Twilio
 */
export function validateTwilioSignature(
  req: Request,
  authToken: string
): boolean {
  try {
    const twilioSignature = req.headers['x-twilio-signature'] as string;

    if (!twilioSignature) {
      console.warn('No Twilio signature header found');
      return false;
    }

    // Build the full URL
    const protocol = req.protocol;
    const host = req.get('host');
    const url = `${protocol}://${host}${req.originalUrl}`;

    // Compute expected signature
    const data = Object.keys(req.body)
      .sort()
      .reduce((acc, key) => acc + key + req.body[key], url);

    const expectedSignature = crypto
      .createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');

    return twilioSignature === expectedSignature;
  } catch (error) {
    console.error('Error validating Twilio signature:', error);
    return false;
  }
}

/**
 * Middleware wrapper for Twilio signature validation
 * Automatically bypasses validation in development, enforces in production
 */
export function twilioValidationMiddleware(authToken: string) {
  return (req: Request, res: any, next: any) => {
    const isDev = process.env.NODE_ENV !== 'production';

    // Skip validation in development
    if (isDev) {
      console.warn('⚠️  Skipping Twilio signature validation in development');
      return next();
    }

    // In production, perform actual signature validation
    const isValid = validateTwilioSignature(req, authToken);

    if (!isValid) {
      console.error('Invalid Twilio signature');
      return res.status(403).json({ error: 'Invalid signature' });
    }

    next();
  };
}
