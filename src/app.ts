import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { config } from '@config/index';
import { swaggerSpec } from '@config/swagger';
import { morganStream } from '@infrastructure/logging/morgan.stream';
import { requestIdMiddleware } from '@shared/middleware/requestId.middleware';
import { mongoSanitizeMiddleware } from '@shared/middleware/mongoSanitize.middleware';
import { errorHandler, notFoundHandler } from '@shared/middleware/errorHandler.middleware';
import { initializeContainer } from '@shared/di/index';
import routes from './routes';

export function createApp(): Application {
  initializeContainer();
  const app = express();

  app.set('trust proxy', 1);

  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(mongoSanitizeMiddleware);

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          details: [],
        },
      },
    }),
  );

  if (config.NODE_ENV !== 'test') {
    app.use(
      morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev', {
        stream: morganStream,
      }),
    );
  }

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use('/api/v1', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
