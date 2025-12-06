"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
const zod_1 = require("zod");
const response_1 = require("../utils/response");
const constants_1 = require("../utils/constants");
/**
 * Global error handler middleware
 */
function errorHandler(error, req, res, next) {
    console.error('Error:', error);
    // Zod validation errors
    if (error instanceof zod_1.ZodError) {
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.VALIDATION_ERROR, 'Validation failed', constants_1.HTTP_STATUS.BAD_REQUEST, { errors: error.errors });
        return;
    }
    // Default error
    (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, error.message || 'Internal server error', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
}
/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res) {
    (0, response_1.sendError)(res, constants_1.ERROR_CODES.NOT_FOUND, `Route ${req.method} ${req.path} not found`, constants_1.HTTP_STATUS.NOT_FOUND);
}
//# sourceMappingURL=error.js.map