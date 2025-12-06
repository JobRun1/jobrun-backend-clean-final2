"use strict";
// Shared utilities across JobRun monorepo
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSuccessResponse = createSuccessResponse;
exports.createErrorResponse = createErrorResponse;
exports.apiFetch = apiFetch;
exports.sleep = sleep;
exports.formatDate = formatDate;
exports.isValidEmail = isValidEmail;
/**
 * Create a successful API response
 */
function createSuccessResponse(data) {
    return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
    };
}
/**
 * Create an error API response
 */
function createErrorResponse(code, message, details) {
    return {
        success: false,
        error: {
            code,
            message,
            details,
        },
        timestamp: new Date().toISOString(),
    };
}
/**
 * Type-safe fetch wrapper for frontend
 */
async function apiFetch(url, options) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
        });
        const data = await response.json();
        return data;
    }
    catch (error) {
        return createErrorResponse('FETCH_ERROR', error instanceof Error ? error.message : 'Unknown error occurred');
    }
}
/**
 * Sleep utility
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Format date consistently
 */
function formatDate(date) {
    return new Date(date).toISOString();
}
/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
//# sourceMappingURL=utils.js.map