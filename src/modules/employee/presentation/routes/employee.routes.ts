import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller';
import { validate } from '@shared/middleware/validate.middleware';
import {
  authenticate,
  requirePermission,
  authorizeCompany,
} from '@shared/middleware/auth.middleware';
import { createEmployeeSchema, updateEmployeeSchema } from '../validators/employee.validator';

const router = Router();
const controller = new EmployeeController();

/**
 * @openapi
 * /employees:
 *   post:
 *     tags:
 *       - Employees
 *     summary: Create an employee (requires manage_employees permission)
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
 *               - roleId
 *               - firstName
 *               - lastName
 *               - department
 *               - position
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               roleId:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               department:
 *                 type: string
 *               position:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Employee profile and credentials created
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post(
  '/',
  authenticate,
  requirePermission('manage_employees'),
  authorizeCompany,
  validate(createEmployeeSchema),
  controller.create,
);

/**
 * @openapi
 * /employees:
 *   get:
 *     tags:
 *       - Employees
 *     summary: List all employees for the company (requires view_employees permission)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of employees returned
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
 * /employees/{id}:
 *   get:
 *     tags:
 *       - Employees
 *     summary: Get employee profile details by ID
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
 *         description: Employee details
 *       404:
 *         description: Employee not found
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
 * /employees/{id}:
 *   put:
 *     tags:
 *       - Employees
 *     summary: Update employee profile (requires manage_employees permission)
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
 *         description: Employee updated
 *       404:
 *         description: Employee not found
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('manage_employees'),
  authorizeCompany,
  validate(updateEmployeeSchema),
  controller.update,
);

/**
 * @openapi
 * /employees/{id}:
 *   delete:
 *     tags:
 *       - Employees
 *     summary: Delete employee profile and credentials (requires manage_employees permission)
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
 *         description: Employee deleted
 *       404:
 *         description: Employee not found
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('manage_employees'),
  authorizeCompany,
  controller.delete,
);

export default router;
