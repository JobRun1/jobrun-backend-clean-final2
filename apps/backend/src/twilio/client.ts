import twilio from 'twilio';

/**
 * Twilio client singleton
 */
let twilioClient: twilio.Twilio | null = null;

export function getTwilioClient(): twilio.Twilio {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set');
    }

    twilioClient = twilio(accountSid, authToken);
  }

  return twilioClient;
}

/**
 * Send SMS via Twilio with automatic retry on transient failures
 *
 * @param to - Recipient phone number (E.164 format)
 * @param from - Sender phone number (E.164 format)
 * @param body - Message body
 * @param options - Optional retry configuration and correlation ID
 * @returns Twilio message SID
 * @throws Error if all retry attempts fail
 */
export async function sendSMS(
  to: string,
  from: string,
  body: string,
  options: { retries?: number; correlationId?: string } = {}
): Promise<string> {
  const { retries = 3, correlationId } = options;
  const client = getTwilioClient();

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🚨 FORENSIC LOGGING - Identify alert spam source
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      if (attempt === 1) {
        console.error("🚨🚨🚨 TWILIO SEND EXECUTED FROM:", __filename);
        console.error("🚨 STACK TRACE:", new Error().stack);
      }
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      const message = await client.messages.create({
        to,
        from,
        body,
      });

      if (attempt > 1) {
        console.log('✅ SMS send succeeded on retry', {
          correlationId,
          attempt,
          to,
          messageSid: message.sid,
        });
      }

      return message.sid;

    } catch (error) {
      lastError = error as Error;

      // Extract Twilio error code if available
      const twilioError = error as any;
      const errorCode = twilioError.code;
      const errorMessage = twilioError.message || lastError.message;

      console.error(`❌ SMS send failed (attempt ${attempt}/${retries})`, {
        correlationId,
        to,
        error: errorMessage,
        errorCode,
        attempt,
      });

      // If this is the last attempt, break and throw
      if (attempt === retries) {
        break;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delayMs = Math.pow(2, attempt - 1) * 1000;
      console.log(`⏳ Retrying SMS send in ${delayMs}ms...`, {
        correlationId,
        attempt: attempt + 1,
        maxAttempts: retries,
      });

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  // All retries exhausted - log critical error
  console.error('🚨 SMS send failed after all retries - MESSAGE LOST', {
    correlationId,
    to,
    bodyPreview: body.substring(0, 50),
    attempts: retries,
    finalError: lastError?.message,
    errorCode: (lastError as any)?.code,
  });

  throw new Error(`SMS send failed after ${retries} attempts: ${lastError?.message}`);
}

/**
 * Get Twilio auth token for signature validation
 */
export function getTwilioAuthToken(): string {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    throw new Error('TWILIO_AUTH_TOKEN not set');
  }
  return authToken;
}
