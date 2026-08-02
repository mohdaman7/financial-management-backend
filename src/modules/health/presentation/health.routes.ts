import { Router } from 'express';
import { healthCheck } from './health.controller';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check endpoint
 *     description: Returns API health status including database connectivity
 *     responses:
 *       200:
 *         description: Service is healthy
 *       503:
 *         description: Service is degraded
 */
router.get('/', healthCheck);

export default router;
