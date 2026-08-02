import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { config } from '@config/index';
import { connectDatabase, disconnectDatabase } from '@infrastructure/database/connection';
import { logger } from '@infrastructure/logging/logger';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  const server = app.listen(config.PORT, () => {
    logger.info(`Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
    logger.info(`Swagger docs available at http://localhost:${config.PORT}/api/docs`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    server.close(async () => {
      try {
        await disconnectDatabase();
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});
