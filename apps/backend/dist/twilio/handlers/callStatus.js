"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCallStatus = handleCallStatus;
const router_1 = require("../../modules/messages/router");
const logger_1 = require("../../utils/logger");
const db_1 = require("../../db");
/**
 * Handle call status updates from Twilio
 */
async function handleCallStatus(req, res) {
    try {
        const payload = req.body;
        logger_1.logger.info('Received call status update', {
            from: payload.From,
            to: payload.To,
            callSid: payload.CallSid,
            callStatus: payload.CallStatus,
        });
        // Find which client this number belongs to
        const client = await db_1.prisma.client.findFirst({
            where: { phoneNumber: payload.To },
        });
        if (!client) {
            logger_1.logger.warn('No client found for phone number', { phoneNumber: payload.To });
            res.status(404).send('Client not found');
            return;
        }
        // Handle missed call statuses
        const missedCallStatuses = ['no-answer', 'busy', 'failed', 'canceled'];
        if (missedCallStatuses.includes(payload.CallStatus)) {
            logger_1.logger.info('Detected missed call', {
                from: payload.From,
                callStatus: payload.CallStatus,
            });
            await (0, router_1.routeMissedCall)({
                clientId: client.id,
                from: payload.From,
                to: payload.To,
                callSid: payload.CallSid,
                callStatus: payload.CallStatus,
            });
        }
        // Respond to Twilio
        res.status(200).send('OK');
    }
    catch (error) {
        logger_1.logger.error('Error handling call status', error);
        res.status(500).send('Internal server error');
    }
}
//# sourceMappingURL=callStatus.js.map