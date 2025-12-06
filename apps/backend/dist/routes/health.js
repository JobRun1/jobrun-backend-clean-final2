"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const response_1 = require("../utils/response");
const db_1 = require("../db");
const router = (0, express_1.Router)();
/**
 * GET /health
 * Health check endpoint
 */
router.get('/', async (req, res, next) => {
    try {
        const dbConnected = await (0, db_1.testDatabaseConnection)();
        const response = {
            status: dbConnected ? 'ok' : 'error',
            timestamp: new Date().toISOString(),
            database: dbConnected ? 'connected' : 'disconnected',
        };
        (0, response_1.sendSuccess)(res, response);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=health.js.map