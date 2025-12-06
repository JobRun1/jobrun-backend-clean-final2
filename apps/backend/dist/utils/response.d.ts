import { Response } from 'express';
/**
 * Send a success response
 */
export declare function sendSuccess<T>(res: Response, data: T, statusCode?: number): void;
/**
 * Send an error response
 */
export declare function sendError(res: Response, code: string, message: string, statusCode?: number, details?: Record<string, unknown>): void;
//# sourceMappingURL=response.d.ts.map