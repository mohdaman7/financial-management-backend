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
import travelRoutes from '@modules/travel/presentation/routes/travel.routes';
import auditRoutes from '@modules/audit/presentation/routes/audit.routes';
import notificationRoutes from '@modules/notification/presentation/routes/notification.routes';
import serviceRoutes from '@modules/service/presentation/routes/service.routes';
import documentRoutes from '@modules/customer/presentation/routes/document.routes';
import searchRoutes from '@modules/dashboard/presentation/routes/search.routes';
import importRoutes from '@modules/dashboard/presentation/routes/import.routes';

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
router.use('/travel', travelRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/notifications', notificationRoutes);
router.use('/services', serviceRoutes);
router.use('/documents', documentRoutes);
router.use('/search', searchRoutes);
router.use('/import', importRoutes);

export default router;
