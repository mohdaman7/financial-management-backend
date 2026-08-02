import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller';
import { validate } from '@shared/middleware/validate.middleware';
import { authenticate, requireSuperAdmin } from '@shared/middleware/auth.middleware';
import { createCompanySchema, updateCompanySchema } from '../validators/company.validator';

const router = Router();
const controller = new CompanyController();

/**
 * @openapi
 * /companies:
 *   post:
 *     tags:
 *       - Companies
 *     summary: Create a new company
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
 *               - code
 *             properties:
 *               name:
 *                 type: string
 *                 example: Travel Experts
 *               code:
 *                 type: string
 *                 example: TREXP
 *     responses:
 *       201:
 *         description: Company created successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Forbidden - Super Admin only
 *       409:
 *         description: Code already exists
 */
router.post('/', authenticate, requireSuperAdmin, validate(createCompanySchema), controller.create);

/**
 * @openapi
 * /companies:
 *   get:
 *     tags:
 *       - Companies
 *     summary: Get all companies
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of companies returned
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.get('/', authenticate, requireSuperAdmin, controller.list);

/**
 * @openapi
 * /companies/{id}:
 *   get:
 *     tags:
 *       - Companies
 *     summary: Get company by ID
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
 *         description: Company details returned
 *       403:
 *         description: Forbidden - Super Admin only
 *       404:
 *         description: Company not found
 */
router.get('/:id', authenticate, requireSuperAdmin, controller.getById);

/**
 * @openapi
 * /companies/{id}:
 *   put:
 *     tags:
 *       - Companies
 *     summary: Update company details
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
 *         description: Company updated successfully
 *       403:
 *         description: Forbidden - Super Admin only
 *       404:
 *         description: Company not found
 */
router.put(
  '/:id',
  authenticate,
  requireSuperAdmin,
  validate(updateCompanySchema),
  controller.update,
);

export default router;
