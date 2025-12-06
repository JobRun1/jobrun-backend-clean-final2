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
 * Send SMS via Twilio
 */
export async function sendSMS(
  to: string,
  from: string,
  body: string
): Promise<string> {
  try {
    const client = getTwilioClient();
    const message = await client.messages.create({
      to,
      from,
      body,
    });

    return message.sid;
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
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
