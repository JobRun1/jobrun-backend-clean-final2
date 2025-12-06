import type { ApiResponse } from './types';
/**
 * Create a successful API response
 */
export declare function createSuccessResponse<T>(data: T): ApiResponse<T>;
/**
 * Create an error API response
 */
export declare function createErrorResponse(code: string, message: string, details?: Record<string, unknown>): ApiResponse;
/**
 * Type-safe fetch wrapper for frontend
 */
export declare function apiFetch<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>>;
/**
 * Sleep utility
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Format date consistently
 */
export declare function formatDate(date: Date | string): string;
/**
 * Validate email format
 */
export declare function isValidEmail(email: string): boolean;
//# sourceMappingURL=utils.d.ts.map