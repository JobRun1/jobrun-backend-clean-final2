import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Zod validation middleware factory
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}
