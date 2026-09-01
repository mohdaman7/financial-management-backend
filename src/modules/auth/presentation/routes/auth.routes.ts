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
 * /auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get current authenticated user profile and permissions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile and permissions
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, controller.me);

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
 *             properties:
 *               refresh_token:
 *                 type: string
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
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refresh_token:
 *                 type: string
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post('/logout', (req, res, next) => {
  // Try authenticating optionally if bearer token is present
  if (req.headers.authorization) {
    return authenticate(req, res, () => controller.logout(req, res, next));
  }
  return controller.logout(req, res, next);
});

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
