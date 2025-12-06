"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTP_STATUS = exports.ERROR_CODES = exports.JWT_CONFIG = exports.PAGINATION = exports.API_CONFIG = exports.APP_VERSION = exports.APP_NAME = void 0;
/**
 * Application constants
 */
exports.APP_NAME = 'JobRun';
exports.APP_VERSION = '1.0.0';
/**
 * API configuration
 */
exports.API_CONFIG = {
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
};
/**
 * Pagination defaults
 */
exports.PAGINATION = {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
};
/**
 * JWT configuration
 */
exports.JWT_CONFIG = {
    EXPIRY: '7d',
    ALGORITHM: 'HS256',
};
/**
 * Error codes
 */
exports.ERROR_CODES = {
    // Authentication
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    // Validation
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',
    // Database
    DATABASE_ERROR: 'DATABASE_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    ALREADY_EXISTS: 'ALREADY_EXISTS',
    CONFLICT: 'CONFLICT',
    // Server
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
};
/**
 * HTTP status codes
 */
exports.HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
};
//# sourceMappingURL=constants.js.map