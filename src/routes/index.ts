import { Router } from 'express';
import healthRoutes from '@modules/health/presentation/health.routes';
import authRoutes from '@modules/auth/presentation/routes/auth.routes';
import roleRoutes from '@modules/auth/presentation/routes/role.routes';
import userRoutes from '@modules/auth/presentation/routes/user.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/roles', roleRoutes);
router.use('/users', userRoutes);

export default router;
