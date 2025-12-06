"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireClient = requireClient;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const response_1 = require("../utils/response");
const constants_1 = require("../utils/constants");
const env_1 = require("../env");
/**
 * JWT authentication middleware
 * Verifies token and attaches user to request
 */
function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.UNAUTHORIZED, 'No token provided', constants_1.HTTP_STATUS.UNAUTHORIZED);
            return;
        }
        const token = authHeader.substring(7);
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.UNAUTHORIZED, 'Invalid or expired token', constants_1.HTTP_STATUS.UNAUTHORIZED);
    }
}
/**
 * Require CLIENT role middleware
 */
function requireClient(req, res, next) {
    try {
        if (!req.user) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.UNAUTHORIZED, 'Authentication required', constants_1.HTTP_STATUS.UNAUTHORIZED);
            return;
        }
        if (req.user.role !== 'CLIENT') {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.FORBIDDEN, 'Client access required', constants_1.HTTP_STATUS.FORBIDDEN);
            return;
        }
        next();
    }
    catch (error) {
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.UNAUTHORIZED, 'Client verification failed', constants_1.HTTP_STATUS.UNAUTHORIZED);
    }
}
//# sourceMappingURL=auth.js.map