"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTwilioClient = getTwilioClient;
exports.sendSMS = sendSMS;
exports.getTwilioAuthToken = getTwilioAuthToken;
const twilio_1 = __importDefault(require("twilio"));
/**
 * Twilio client singleton
 */
let twilioClient = null;
function getTwilioClient() {
    if (!twilioClient) {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        if (!accountSid || !authToken) {
            throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set');
        }
        twilioClient = (0, twilio_1.default)(accountSid, authToken);
    }
    return twilioClient;
}
/**
 * Send SMS via Twilio
 */
async function sendSMS(to, from, body) {
    try {
        const client = getTwilioClient();
        const message = await client.messages.create({
            to,
            from,
            body,
        });
        return message.sid;
    }
    catch (error) {
        console.error('Error sending SMS:', error);
        throw error;
    }
}
/**
 * Get Twilio auth token for signature validation
 */
function getTwilioAuthToken() {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
        throw new Error('TWILIO_AUTH_TOKEN not set');
    }
    return authToken;
}
//# sourceMappingURL=client.js.map