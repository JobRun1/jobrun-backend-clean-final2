import { Request } from 'express';
/**
 * Extended Express Request with user authentication
 */
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
        clientId?: string;
    };
    isImpersonating?: boolean;
    impersonationToken?: string;
}
//# sourceMappingURL=express.d.ts.map