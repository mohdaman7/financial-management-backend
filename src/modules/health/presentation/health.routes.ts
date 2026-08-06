import { Router } from 'express';
import { healthCheck } from './health.controller';
import { UserModel } from '../../auth/infrastructure/models/User.model';
import bcrypt from 'bcrypt';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check endpoint
 *     description: Returns API health status including database connectivity
 *     responses:
 *       200:
 *         description: Service is healthy
 *       503:
 *         description: Service is degraded
 */
router.get('/', healthCheck);

router.get('/seed', async (req, res) => {
  try {
    const email = (req.query.email as string) || 'superadmin@erp.com';
    const password = (req.query.password as string) || 'password123';

    const existingAdmin = await UserModel.findOne({ email });
    if (existingAdmin) {
      return res.json({ message: `Super admin with email ${email} already exists!` });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await UserModel.create({
      email,
      passwordHash,
      isSuperAdmin: true,
      status: 'active'
    });
    res.json({ message: `Success! Super admin created with email: ${email}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
