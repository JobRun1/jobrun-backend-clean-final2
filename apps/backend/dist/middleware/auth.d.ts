import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express';
/**
 * JWT authentication middleware
 * Verifies token and attaches user to request
 */
export declare function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
/**
 * Require CLIENT role middleware
 */
export declare function requireClient(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map