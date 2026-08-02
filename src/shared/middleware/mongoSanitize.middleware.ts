import { Request, Response, NextFunction } from 'express';

/**
 * Recursively removes keys starting with '$' or containing '.' to prevent NoSQL Injection.
 */
function sanitize(target: unknown): void {
  if (target && typeof target === 'object') {
    const obj = target as Record<string, unknown>;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
        } else {
          sanitize(obj[key]);
        }
      }
    }
  }
}

export function mongoSanitizeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.body) {
    sanitize(req.body);
  }
  if (req.params) {
    sanitize(req.params);
  }
  if (req.query) {
    // In Express 5, req.query is a getter. Sanitizing the properties in-place
    // avoids reassigning the property and causing TypeError.
    sanitize(req.query);
  }
  next();
}
