import { Router } from 'express';
import { ServiceController } from '../controllers/service.controller';
import { validate } from '@shared/middleware/validate.middleware';
import {
  authenticate,
  requirePermission,
  authorizeCompany,
} from '@shared/middleware/auth.middleware';
import { createServiceSchema, updateServiceSchema } from '../validators/service.validator';

const router = Router();
const controller = new ServiceController();

/**
 * @openapi
 * /services:
 *   post:
 *     tags:
 *       - Service Knowledge Base
 *     summary: Create a new service (requires manage_services permission)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Service created successfully
 */
router.post(
  '/',
  authenticate,
  requirePermission('manage_services'),
  authorizeCompany,
  validate(createServiceSchema),
  controller.create,
);

/**
 * @openapi
 * /services:
 *   get:
 *     tags:
 *       - Service Knowledge Base
 *     summary: List company services and knowledge base entries
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of services
 */
router.get('/', authenticate, requirePermission('view_services'), authorizeCompany, controller.list);

/**
 * @openapi
 * /services/{id}:
 *   get:
 *     tags:
 *       - Service Knowledge Base
 *     summary: Get details and knowledge base for a specific service
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
 *         description: Service object
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('view_services'),
  authorizeCompany,
  controller.getById,
);

/**
 * @openapi
 * /services/{id}:
 *   put:
 *     tags:
 *       - Service Knowledge Base
 *     summary: Update service settings and knowledge base
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Service updated
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('manage_services'),
  authorizeCompany,
  validate(updateServiceSchema),
  controller.update,
);

/**
 * @openapi
 * /services/{id}:
 *   delete:
 *     tags:
 *       - Service Knowledge Base
 *     summary: Delete service record
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
 *         description: Service deleted
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('manage_services'),
  authorizeCompany,
  controller.delete,
);

export default router;
