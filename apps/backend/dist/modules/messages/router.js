"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeInboundSMS = routeInboundSMS;
exports.routeMissedCall = routeMissedCall;
exports.getConversationHistory = getConversationHistory;
const service_1 = require("../customer/service");
const service_2 = require("../conversation/service");
const client_1 = require("../../twilio/client");
const logger_1 = require("../../utils/logger");
const client_2 = require("@prisma/client");
/**
 * Route inbound SMS message
 */
async function routeInboundSMS(params) {
    try {
        logger_1.logger.info('Routing inbound SMS', {
            from: params.from,
            to: params.to,
            clientId: params.clientId,
        });
        // 1. Find or create customer
        const customer = await (0, service_1.findOrCreateCustomer)(params.clientId, params.from);
        // 2. Find or create conversation thread
        const conversation = await (0, service_2.findOrCreateConversation)(params.clientId, customer.id);
        // 3. Save inbound message
        await (0, service_2.addMessage)({
            conversationId: conversation.id,
            clientId: params.clientId,
            customerId: customer.id,
            direction: client_2.MessageDirection.INBOUND,
            type: client_2.MessageType.SMS,
            body: params.body,
            twilioSid: params.twilioSid,
        });
        // 4. Send placeholder auto-response
        const responseBody = 'Thanks for your message — JobRun Phase 2 router active.';
        const twilioSid = await (0, client_1.sendSMS)(params.from, params.to, responseBody);
        // 5. Save outbound message
        await (0, service_2.addMessage)({
            conversationId: conversation.id,
            clientId: params.clientId,
            customerId: customer.id,
            direction: client_2.MessageDirection.OUTBOUND,
            type: client_2.MessageType.SMS,
            body: responseBody,
            twilioSid,
        });
        logger_1.logger.info('Routed inbound SMS successfully', {
            customerId: customer.id,
            conversationId: conversation.id,
        });
    }
    catch (error) {
        logger_1.logger.error('Error routing inbound SMS', error);
        throw error;
    }
}
/**
 * Route missed call event
 */
async function routeMissedCall(params) {
    try {
        logger_1.logger.info('Routing missed call', {
            from: params.from,
            to: params.to,
            clientId: params.clientId,
            callStatus: params.callStatus,
        });
        // 1. Find or create customer
        const customer = await (0, service_1.findOrCreateCustomer)(params.clientId, params.from);
        // 2. Find or create conversation thread
        const conversation = await (0, service_2.findOrCreateConversation)(params.clientId, customer.id);
        // 3. Add system message about missed call
        await (0, service_2.addMessage)({
            conversationId: conversation.id,
            clientId: params.clientId,
            customerId: customer.id,
            direction: client_2.MessageDirection.SYSTEM,
            type: client_2.MessageType.CALL,
            body: `Missed call from ${params.from}`,
            metadata: {
                callSid: params.callSid,
                callStatus: params.callStatus,
            },
        });
        // 4. Send placeholder SMS response for missed call
        const responseBody = `Hi! We missed your call. JobRun Phase 2 - we'll get back to you soon!`;
        const twilioSid = await (0, client_1.sendSMS)(params.from, params.to, responseBody);
        // 5. Save outbound SMS message
        await (0, service_2.addMessage)({
            conversationId: conversation.id,
            clientId: params.clientId,
            customerId: customer.id,
            direction: client_2.MessageDirection.OUTBOUND,
            type: client_2.MessageType.SMS,
            body: responseBody,
            twilioSid,
        });
        logger_1.logger.info('Routed missed call successfully', {
            customerId: customer.id,
            conversationId: conversation.id,
        });
    }
    catch (error) {
        logger_1.logger.error('Error routing missed call', error);
        throw error;
    }
}
/**
 * Get conversation history for a customer
 */
async function getConversationHistory(customerId) {
    const { getCustomerConversations } = await Promise.resolve().then(() => __importStar(require('../conversation/service')));
    return getCustomerConversations(customerId);
}
//# sourceMappingURL=router.js.map