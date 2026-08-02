import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '@shared/errors/AppError';

type RequestPart = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      next(AppError.badRequest('Validation failed', 'VALIDATION_ERROR', details));
      return;
    }

    req[part] = result.data;
    next();
  };
}
