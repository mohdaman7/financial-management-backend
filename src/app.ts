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
import { auditLogger } from '@shared/middleware/audit.middleware';
import routes from './routes';

export function createApp(): Application {
  initializeContainer();
  const app = express();

  app.set('trust proxy', 1);

  app.use(requestIdMiddleware);
  app.use(helmet());
  const allowedOrigins = config.CORS_ORIGIN.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (
          !origin ||
          config.NODE_ENV !== 'production' ||
          allowedOrigins.includes('*') ||
          allowedOrigins.includes(origin) ||
          origin.endsWith('.vercel.app')
        ) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-company-id', 'x-request-id'],
      exposedHeaders: ['x-request-id'],
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(mongoSanitizeMiddleware);

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: config.NODE_ENV === 'test' ? 1000 : 500,
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
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use(auditLogger());
  app.use('/api/v1', routes);
  app.use('/v1', routes);
  app.use('/api', routes);
  app.use('/', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
