import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '@shared/middleware/validate.middleware';
import { authenticate } from '@shared/middleware/auth.middleware';
import { loginSchema, refreshSchema, switchCompanySchema } from '../validators/auth.validator';

const router = Router();
const controller = new AuthController();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Log in with credentials
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
 *                 example: superadmin@erp.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validate(loginSchema), controller.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', validate(refreshSchema), controller.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Log out user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post('/logout', validate(refreshSchema), controller.logout);

/**
 * @openapi
 * /auth/switch-company:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Switch active company context (Super Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *             properties:
 *               companyId:
 *                 type: string
 *                 example: 60d5ec49-16c7-4969-80bc-dc3212d1fabf
 *     responses:
 *       200:
 *         description: Company context switched successfully
 *       403:
 *         description: Unauthorized to perform this action
 */
router.post(
  '/switch-company',
  authenticate,
  validate(switchCompanySchema),
  controller.switchCompany,
);

export default router;
