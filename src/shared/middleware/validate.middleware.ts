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
      const primaryMessage = details[0]?.message || 'Validation failed';
      const code = primaryMessage.includes('Expected YYYY-MM-DD')
        ? 'INVALID_PARAMS'
        : 'VALIDATION_ERROR';
      next(AppError.badRequest(primaryMessage, code, details));
      return;
    }

    if (part === 'query') {
      for (const key in req.query) {
        delete req.query[key];
      }
      Object.assign(req.query, result.data);
    } else if (part === 'params') {
      for (const key in req.params) {
        delete req.params[key];
      }
      Object.assign(req.params, result.data);
    } else {
      req[part] = result.data;
    }
    next();
  };
}
