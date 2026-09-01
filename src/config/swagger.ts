import swaggerJsdoc from 'swagger-jsdoc';
import { config } from '@config/index';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Financial Management ERP API',
      version: '1.0.0',
      description:
        'Multi-Company ERP and Financial Management System API — supports General Business, Finance & Accounting, and Travel Business operations.',
    },
    servers: [
      {
        url: `http://localhost:${config.PORT}/v1`,
        description: 'Skyfall v1 Base URL',
      },
      {
        url: `http://localhost:${config.PORT}/api/v1`,
        description: 'API v1 Base URL',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
    },
  },
  apis: [
    './src/modules/**/presentation/routes/*.routes.ts',
    './src/modules/**/presentation/*.routes.ts',
    './src/routes/*.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

