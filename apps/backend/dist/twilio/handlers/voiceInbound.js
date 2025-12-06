"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleInboundVoice = handleInboundVoice;
const logger_1 = require("../../utils/logger");
const service_1 = require("../../modules/customer/service");
const service_2 = require("../../modules/conversation/service");
const client_1 = require("@prisma/client");
/**
 * Handle inbound voice call from Twilio - Simplified version
 */
async function handleInboundVoice(req, res) {
    try {
        const payload = req.body;
        logger_1.logger.info('📞 [VOICE INBOUND] Received inbound call', {
            from: payload.From,
            to: payload.To,
            callSid: payload.CallSid,
        });
        // Extract client ID from request
        const clientId = req.headers['x-client-id'] || 'default-client-id';
        // Find or create customer
        const customer = await (0, service_1.findOrCreateCustomer)(clientId, payload.From);
        // Find or create conversation
        const conversation = await (0, service_2.findOrCreateConversation)(clientId, customer.id);
        // Log the call
        await (0, service_2.addMessage)({
            conversationId: conversation.id,
            clientId: clientId,
            customerId: customer.id,
            direction: client_1.MessageDirection.INBOUND,
            type: client_1.MessageType.CALL,
            body: `Inbound call from ${payload.From}`,
            twilioSid: payload.CallSid,
        });
        logger_1.logger.info('✅ [VOICE INBOUND] Call logged to database');
        // Respond with TwiML
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling. Please leave a message after the beep.</Say>
  <Record maxLength="120" transcribe="true" />
  <Say>Thank you. Goodbye.</Say>
</Response>`;
        res.type('text/xml').send(twiml);
    }
    catch (error) {
        logger_1.logger.error('❌ [VOICE INBOUND] Error handling inbound call:', error instanceof Error ? error : { error });
        const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">We're sorry, but we're unable to process your call at this time. Please try again later.</Say>
  <Hangup />
</Response>`;
        res.type('text/xml').send(errorTwiml);
    }
}
//# sourceMappingURL=voiceInbound.js.map