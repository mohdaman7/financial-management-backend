import { Request, Response } from 'express';
import { getDatabaseStatus } from '@infrastructure/database/connection';
import { ResponseFormatter } from '@shared/utils/responseFormatter';

const startTime = Date.now();

export function healthCheck(_req: Request, res: Response): void {
  const dbStatus = getDatabaseStatus();

  res.status(dbStatus === 'connected' ? 200 : 503).json(
    ResponseFormatter.success({
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      database: dbStatus,
      timestamp: new Date().toISOString(),
    }),
  );
}
