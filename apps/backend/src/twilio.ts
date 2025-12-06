import twilio from "twilio";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Lazy Twilio Client Initialization
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// CRITICAL FIX:
// This module uses lazy initialization to ensure Twilio client is
// created AFTER environment variables are loaded by dotenv.
//
// Previous Issue:
// - Importing this module immediately called twilio(accountSid, authToken)
// - Environment variables were undefined because dotenv hadn't run yet
// - Caused: "Error: accountSid must start with AC"
//
// Solution:
// - Export a getter function instead of a direct client instance
// - Client is created on first access, after dotenv has loaded
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient() {
  if (!twilioClient) {
    // Validate credentials on first access
    if (!process.env.TWILIO_ACCOUNT_SID) {
      throw new Error("❌ TWILIO_ACCOUNT_SID is not set");
    }
    if (!process.env.TWILIO_AUTH_TOKEN) {
      throw new Error("❌ TWILIO_AUTH_TOKEN is not set");
    }

    console.log("✅ Initializing Twilio client with SID:", process.env.TWILIO_ACCOUNT_SID.substring(0, 10) + "...");

    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  return twilioClient;
}

// Export the getter function as default
export default getTwilioClient();
