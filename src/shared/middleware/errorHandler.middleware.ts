import { Request, Response, NextFunction } from 'express';
import { AppError } from '@shared/errors/AppError';
import { logger } from '@infrastructure/logging/logger';
import { config } from '@config/index';
import { ResponseFormatter } from '@shared/utils/responseFormatter';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    logger.warn(err.message, {
      code: err.code,
      statusCode: err.statusCode,
      requestId: req.requestId,
    });

    res
      .status(err.statusCode)
      .json(ResponseFormatter.error(err.message, err.code, err.details ?? []));
    return;
  }

  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    requestId: req.requestId,
  });

  const errorMessage = config.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  res.status(500).json(ResponseFormatter.error(errorMessage, 'INTERNAL_ERROR'));
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json(ResponseFormatter.error('Route not found', 'NOT_FOUND'));
}
