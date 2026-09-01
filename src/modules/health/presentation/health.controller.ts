import { Request, Response } from 'express';
import { getDatabaseStatus } from '@infrastructure/database/connection';
import { ResponseFormatter } from '@shared/utils/responseFormatter';

const startTime = Date.now();

export function healthCheck(_req: Request, res: Response): void {
  const dbStatus = getDatabaseStatus();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const memoryUsage = process.memoryUsage();

  const isHealthy = dbStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json(
    ResponseFormatter.success({
      status: isHealthy ? 'healthy' : 'degraded',
      service: 'skyfall-financial-management-api',
      version: '2.4.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: uptimeSeconds,
      uptime_human: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
      database: dbStatus,
      memory: {
        heap_used_mb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
        heap_total_mb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
        rss_mb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
      },
      timestamp: new Date().toISOString(),
    }),
  );
}
