import { Router } from 'express';
import healthRoutes from '@modules/health/presentation/health.routes';
import authRoutes from '@modules/auth/presentation/routes/auth.routes';
import roleRoutes from '@modules/auth/presentation/routes/role.routes';
import userRoutes from '@modules/auth/presentation/routes/user.routes';
import companyRoutes from '@modules/company/presentation/routes/company.routes';
import employeeRoutes from '@modules/employee/presentation/routes/employee.routes';
import attendanceRoutes from '@modules/attendance/presentation/routes/attendance.routes';
import dashboardRoutes from '@modules/dashboard/presentation/routes/dashboard.routes';
import financeRoutes from '@modules/finance/presentation/routes/finance.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/roles', roleRoutes);
router.use('/users', userRoutes);
router.use('/companies', companyRoutes);
router.use('/employees', employeeRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/finance', financeRoutes);

export default router;
