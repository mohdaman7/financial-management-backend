import { Container } from './container';
import { UserRepository } from '@modules/auth/infrastructure/repositories/user.repository';
import { RoleRepository } from '@modules/auth/infrastructure/repositories/role.repository';
import { CompanyRepository } from '@modules/company/infrastructure/repositories/company.repository';
import { EmployeeRepository } from '@modules/employee/infrastructure/repositories/employee.repository';
import { AttendanceRepository } from '@modules/attendance/infrastructure/repositories/attendance.repository';
import { TransactionRepository } from '@modules/finance/infrastructure/repositories/transaction.repository';
import { TravelRepository } from '@modules/travel/infrastructure/repositories/travel.repository';
import { AuthService } from '@modules/auth/application/services/auth.service';
import { UserService } from '@modules/auth/application/services/user.service';
import { RoleService } from '@modules/auth/application/services/role.service';
import { CompanyService } from '@modules/company/application/services/company.service';
import { EmployeeService } from '@modules/employee/application/services/employee.service';
import { AttendanceService } from '@modules/attendance/application/services/attendance.service';
import { DashboardService } from '@modules/dashboard/application/services/dashboard.service';
import { FinanceService } from '@modules/finance/application/services/finance.service';
import { TravelService } from '@modules/travel/application/services/travel.service';
import { AuditService } from '@modules/audit/application/services/audit.service';
import { NotificationService } from '@modules/notification/application/services/notification.service';
import { EmailService } from '@shared/services/email.service';

export function initializeContainer(): void {
  // Clear any existing registrations (helps during testing)
  Container.clear();

  // Repositories
  const userRepository = new UserRepository();
  const roleRepository = new RoleRepository();
  const companyRepository = new CompanyRepository();
  const employeeRepository = new EmployeeRepository();
  const attendanceRepository = new AttendanceRepository();
  const transactionRepository = new TransactionRepository();
  const travelRepository = new TravelRepository();

  Container.register('UserRepository', userRepository);
  Container.register('RoleRepository', roleRepository);
  Container.register('CompanyRepository', companyRepository);
  Container.register('EmployeeRepository', employeeRepository);
  Container.register('AttendanceRepository', attendanceRepository);
  Container.register('TransactionRepository', transactionRepository);
  Container.register('TravelRepository', travelRepository);

  // Services
  const authService = new AuthService(userRepository, companyRepository);
  const userService = new UserService(userRepository);
  const roleService = new RoleService(roleRepository);
  const companyService = new CompanyService(companyRepository);
  const employeeService = new EmployeeService(employeeRepository, userRepository);
  const attendanceService = new AttendanceService(attendanceRepository);
  const dashboardService = new DashboardService(
    attendanceRepository,
    employeeRepository,
    transactionRepository,
  );
  const financeService = new FinanceService(transactionRepository);
  const travelService = new TravelService(travelRepository, transactionRepository);
  const auditService = new AuditService();
  const notificationService = new NotificationService();
  const emailService = new EmailService();

  Container.register('AuthService', authService);
  Container.register('UserService', userService);
  Container.register('RoleService', roleService);
  Container.register('CompanyService', companyService);
  Container.register('EmployeeService', employeeService);
  Container.register('AttendanceService', attendanceService);
  Container.register('DashboardService', dashboardService);
  Container.register('FinanceService', financeService);
  Container.register('TravelService', travelService);
  Container.register('AuditService', auditService);
  Container.register('NotificationService', notificationService);
  Container.register('EmailService', emailService);
}
export { Container };
