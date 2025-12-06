"use strict";
/**
 * AI Scheduling API Routes
 * PHASE 10: Added safety validation and admin logging
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SchedulingHandler_1 = require("../services/SchedulingHandler");
const AdminLogger_1 = require("../services/AdminLogger");
const MessageTemplates_1 = require("../services/MessageTemplates");
const router = (0, express_1.Router)();
/**
 * POST /api/ai/scheduling
 * Process AI scheduling message
 * PHASE 10: Enhanced with safety checks and error handling
 */
router.post('/scheduling', async (req, res) => {
    const { message, conversationId, customerPhone, customerName } = req.body;
    // ═══════════════════════════════════════════════════════════════
    // STEP 1: VALIDATE REQUIRED FIELDS
    // ═══════════════════════════════════════════════════════════════
    if (!message || !conversationId) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'INVALID_REQUEST',
                message: 'Message and conversationId are required',
            },
        });
    }
    // ═══════════════════════════════════════════════════════════════
    // STEP 2: GET CLIENT ID FROM AUTH
    // ═══════════════════════════════════════════════════════════════
    const clientId = req.user?.id || req.user?.clientId;
    if (!clientId) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required',
            },
        });
    }
    // ═══════════════════════════════════════════════════════════════
    // STEP 3: PROCESS WITH ERROR HANDLING
    // ═══════════════════════════════════════════════════════════════
    try {
        // Process through AI scheduling handler (safety checks happen inside)
        const result = await SchedulingHandler_1.SchedulingHandler.handle({
            message,
            conversationId,
            clientId,
            customerPhone,
            customerName,
        });
        // Return successful response
        return res.json({
            success: true,
            data: {
                reply: result.reply,
                proposedSlot: result.proposedSlot,
                bookingCreated: result.bookingCreated,
                bookingId: result.bookingId,
            },
        });
    }
    catch (error) {
        // PHASE 10: Log route-level errors
        AdminLogger_1.AdminLogger.log('error', conversationId, clientId, {
            error: String(error),
            context: 'ai_route_post_scheduling',
        });
        // PHASE 10: Return fallback message on any error
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: MessageTemplates_1.MessageTemplates.fallback(),
            },
        });
    }
});
/**
 * GET /api/ai/conversation/:conversationId
 * Get conversation history (future enhancement)
 */
router.get('/conversation/:conversationId', async (req, res) => {
    try {
        const { conversationId } = req.params;
        const history = await SchedulingHandler_1.SchedulingHandler.getConversationHistory(conversationId);
        return res.json({
            success: true,
            data: {
                conversationId,
                messages: history,
            },
        });
    }
    catch (error) {
        console.error('Get conversation error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get conversation history',
            },
        });
    }
});
exports.default = router;
//# sourceMappingURL=ai.js.map