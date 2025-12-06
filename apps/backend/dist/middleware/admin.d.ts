import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express';
/**
 * Admin role verification middleware
 * Ensures the authenticated user has ADMIN role
 */
export declare function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
/**
 * Check if request is in impersonation mode
 */
export declare function checkImpersonation(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
//# sourceMappingURL=admin.d.ts.map