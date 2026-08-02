import { Router } from 'express';
import { RoleController } from '../controllers/role.controller';
import { validate } from '@shared/middleware/validate.middleware';
import {
  authenticate,
  requirePermission,
  authorizeCompany,
} from '@shared/middleware/auth.middleware';
import { createRoleSchema, updateRoleSchema } from '../validators/role.validator';

const router = Router();
const controller = new RoleController();

/**
 * @openapi
 * /roles:
 *   post:
 *     tags:
 *       - Roles
 *     summary: Create a new role
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 example: Travel Agent
 *               description:
 *                 type: string
 *                 example: Custom role for managing travel proposals and bookings
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["view_proposals", "create_proposals"]
 *               companyId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Role created successfully
 */
router.post(
  '/',
  authenticate,
  requirePermission('manage_roles'),
  authorizeCompany,
  validate(createRoleSchema),
  controller.create,
);

/**
 * @openapi
 * /roles:
 *   get:
 *     tags:
 *       - Roles
 *     summary: List roles for active company context
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles listed successfully
 */
router.get('/', authenticate, requirePermission('view_roles'), authorizeCompany, controller.list);

/**
 * @openapi
 * /roles/{id}:
 *   get:
 *     tags:
 *       - Roles
 *     summary: Get role details by ID
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
 *         description: Role details returned
 *       404:
 *         description: Role not found
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('view_roles'),
  authorizeCompany,
  controller.getById,
);

/**
 * @openapi
 * /roles/{id}:
 *   put:
 *     tags:
 *       - Roles
 *     summary: Update role details
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
 *         description: Role updated successfully
 *       404:
 *         description: Role not found
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('manage_roles'),
  authorizeCompany,
  validate(updateRoleSchema),
  controller.update,
);

/**
 * @openapi
 * /roles/{id}:
 *   delete:
 *     tags:
 *       - Roles
 *     summary: Delete a role
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
 *         description: Role deleted successfully
 *       404:
 *         description: Role not found
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('manage_roles'),
  authorizeCompany,
  controller.delete,
);

export default router;
