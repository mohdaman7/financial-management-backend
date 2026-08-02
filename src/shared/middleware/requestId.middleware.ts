import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  try {
    req.requestId = req.headers['x-request-id']?.toString() ?? uuidv4();
    next();
  } catch (error) {
    console.error('ERROR IN REQUEST_ID MIDDLEWARE:', error);
    throw error;
  }
}
