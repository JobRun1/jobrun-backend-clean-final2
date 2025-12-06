"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleInboundSMS = handleInboundSMS;
const logger_1 = require("../../utils/logger");
const service_1 = require("../../modules/customer/service");
const service_2 = require("../../modules/conversation/service");
const client_1 = require("../client");
const client_2 = require("@prisma/client");
/**
 * Handle inbound SMS from Twilio - Simplified version
 */
async function handleInboundSMS(req, res) {
    try {
        const payload = req.body;
        logger_1.logger.info('📥 [SMS INBOUND] Received inbound SMS', {
            from: payload.From,
            to: payload.To,
            body: payload.Body?.substring(0, 100),
        });
        // Extract client ID from request (you'll need to implement your client routing logic)
        const clientId = req.headers['x-client-id'] || 'default-client-id';
        // Find or create customer
        const customer = await (0, service_1.findOrCreateCustomer)(clientId, payload.From);
        // Find or create conversation
        const conversation = await (0, service_2.findOrCreateConversation)(clientId, customer.id);
        // Save incoming message
        await (0, service_2.addMessage)({
            conversationId: conversation.id,
            clientId: clientId,
            customerId: customer.id,
            direction: client_2.MessageDirection.INBOUND,
            type: client_2.MessageType.SMS,
            body: payload.Body || '',
            twilioSid: payload.MessageSid,
        });
        logger_1.logger.info('✅ [SMS INBOUND] Message saved to database');
        // Send auto-response (customize this based on your business logic)
        const autoResponse = `Thank you for your message! We'll get back to you shortly.`;
        await (0, client_1.sendSMS)(payload.From, payload.To, autoResponse);
        logger_1.logger.info('📤 [SMS INBOUND] Sent auto-response');
        // Respond to Twilio with 200 OK
        res.status(200).send('OK');
    }
    catch (error) {
        logger_1.logger.error('❌ [SMS INBOUND] Error handling inbound SMS:', error instanceof Error ? error : { error });
        res.status(500).send('Error processing SMS');
    }
}
//# sourceMappingURL=smsInbound.js.map