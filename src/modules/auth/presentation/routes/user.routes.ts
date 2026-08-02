import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { validate } from '@shared/middleware/validate.middleware';
import {
  authenticate,
  requirePermission,
  authorizeCompany,
} from '@shared/middleware/auth.middleware';
import { createUserSchema, updateUserSchema } from '../validators/user.validator';

const router = Router();
const controller = new UserController();

/**
 * @openapi
 * /users:
 *   post:
 *     tags:
 *       - Users / Employees
 *     summary: Create a new user (employee)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: employee@erp.com
 *               password:
 *                 type: string
 *                 example: password123
 *               isSuperAdmin:
 *                 type: boolean
 *               companyId:
 *                 type: string
 *               roleId:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       403:
 *         description: Max Super Admins limit reached or unauthorized
 */
router.post(
  '/',
  authenticate,
  requirePermission('manage_employees'),
  authorizeCompany,
  validate(createUserSchema),
  controller.create,
);

/**
 * @openapi
 * /users:
 *   get:
 *     tags:
 *       - Users / Employees
 *     summary: List employees for active company context
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Employees listed successfully
 */
router.get(
  '/',
  authenticate,
  requirePermission('view_employees'),
  authorizeCompany,
  controller.list,
);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags:
 *       - Users / Employees
 *     summary: Get user details by ID
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
 *         description: User details returned
 *       404:
 *         description: User not found
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('view_employees'),
  authorizeCompany,
  controller.getById,
);

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     tags:
 *       - Users / Employees
 *     summary: Update user details
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
 *         description: User updated successfully
 *       404:
 *         description: User not found
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('manage_employees'),
  authorizeCompany,
  validate(updateUserSchema),
  controller.update,
);

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     tags:
 *       - Users / Employees
 *     summary: Delete a user
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
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('manage_employees'),
  authorizeCompany,
  controller.delete,
);

export default router;
