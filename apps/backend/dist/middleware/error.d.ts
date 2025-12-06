import { Request, Response, NextFunction } from 'express';
/**
 * Global error handler middleware
 */
export declare function errorHandler(error: Error, req: Request, res: Response, next: NextFunction): void;
/**
 * 404 Not Found handler
 */
export declare function notFoundHandler(req: Request, res: Response): void;
//# sourceMappingURL=error.d.ts.map