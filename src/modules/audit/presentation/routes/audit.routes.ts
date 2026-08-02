import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { authenticate, requireSuperAdmin } from '@shared/middleware/auth.middleware';

const router = Router();
const controller = new AuditController();

/**
 * @openapi
 * /audit-logs:
 *   get:
 *     tags:
 *       - Audit Logs
 *     summary: Retrieve system mutation logs (Super Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of audit records
 */
router.get('/', authenticate, requireSuperAdmin, controller.list);

export default router;
