import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate, authorizeCompany } from '@shared/middleware/auth.middleware';

const router = Router();
const controller = new DashboardController();

/**
 * @openapi
 * /dashboard:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Get dashboard metrics for the current company context
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard metrics returned
 */
router.get('/', authenticate, authorizeCompany, controller.getMetrics);

/**
 * @openapi
 * /dashboard/financial-summary:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Get dashboard financial summary and KPIs across all customers
 *     security:
 *       - bearerAuth: []
 */
router.get('/financial-summary', authenticate, authorizeCompany, controller.getFinancialSummary);

export default router;
