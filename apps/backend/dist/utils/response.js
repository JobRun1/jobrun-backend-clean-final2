"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
const utils_1 = require("../shared/utils");
const constants_1 = require("./constants");
/**
 * Send a success response
 */
function sendSuccess(res, data, statusCode = constants_1.HTTP_STATUS.OK) {
    const response = (0, utils_1.createSuccessResponse)(data);
    res.status(statusCode).json(response);
}
/**
 * Send an error response
 */
function sendError(res, code, message, statusCode = constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, details) {
    const response = (0, utils_1.createErrorResponse)(code, message, details);
    res.status(statusCode).json(response);
}
//# sourceMappingURL=response.js.map