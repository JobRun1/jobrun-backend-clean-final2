import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
/**
 * Zod validation middleware factory
 */
export declare function validate(schema: ZodSchema): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validate.d.ts.map