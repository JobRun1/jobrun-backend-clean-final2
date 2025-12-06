"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = requireAdmin;
exports.checkImpersonation = checkImpersonation;
const response_1 = require("../utils/response");
const constants_1 = require("../utils/constants");
/**
 * Admin role verification middleware
 * Ensures the authenticated user has ADMIN role
 */
function requireAdmin(req, res, next) {
    try {
        // Check if user is authenticated
        if (!req.user) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.UNAUTHORIZED, 'Authentication required', constants_1.HTTP_STATUS.UNAUTHORIZED);
            return;
        }
        // Check if user has ADMIN role
        if (req.user.role !== 'ADMIN') {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.FORBIDDEN, 'Admin access required', constants_1.HTTP_STATUS.FORBIDDEN);
            return;
        }
        next();
    }
    catch (error) {
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.UNAUTHORIZED, 'Admin verification failed', constants_1.HTTP_STATUS.UNAUTHORIZED);
    }
}
/**
 * Check if request is in impersonation mode
 */
function checkImpersonation(req, res, next) {
    const impersonationHeader = req.headers['x-admin-impersonation'];
    if (impersonationHeader) {
        req.isImpersonating = true;
        req.impersonationToken = impersonationHeader;
    }
    next();
}
//# sourceMappingURL=admin.js.map