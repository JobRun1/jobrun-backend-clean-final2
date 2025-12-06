"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const response_1 = require("../utils/response");
const service_1 = require("../modules/conversation/service");
const router = (0, express_1.Router)();
/**
 * GET /api/messages/conversation/:customerId
 * Get conversation history for a customer
 */
router.get('/conversation/:customerId', async (req, res, next) => {
    try {
        const { customerId } = req.params;
        const conversations = await (0, service_1.getCustomerConversations)(customerId);
        (0, response_1.sendSuccess)(res, conversations);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=messages.js.map