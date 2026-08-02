import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '@shared/middleware/auth.middleware';

const router = Router();
const controller = new NotificationController();

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: Retrieve notification history for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get('/', authenticate, controller.list);

/**
 * @openapi
 * /notifications/{id}/read:
 *   put:
 *     tags:
 *       - Notifications
 *     summary: Mark a notification as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification updated
 */
router.put('/:id/read', authenticate, controller.markRead);

export default router;
