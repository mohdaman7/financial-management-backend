import { Container } from './container';
import { UserRepository } from '@modules/auth/infrastructure/repositories/user.repository';
import { RoleRepository } from '@modules/auth/infrastructure/repositories/role.repository';
import { CompanyRepository } from '@modules/company/infrastructure/repositories/company.repository';
import { EmployeeRepository } from '@modules/employee/infrastructure/repositories/employee.repository';
import { AttendanceRepository } from '@modules/attendance/infrastructure/repositories/attendance.repository';
import { TransactionRepository } from '@modules/finance/infrastructure/repositories/transaction.repository';
import { BankAccountRepository } from '@modules/finance/infrastructure/repositories/bankAccount.repository';
import { TravelRepository } from '@modules/travel/infrastructure/repositories/travel.repository';
import { ServiceRepository } from '@modules/service/infrastructure/repositories/service.repository';
import { CustomerRepository } from '@modules/customer/infrastructure/repositories/customer.repository';
import { ReceiptRepository } from '@modules/finance/infrastructure/repositories/receipt.repository';
import { InvoiceRepository } from '@modules/finance/infrastructure/repositories/invoice.repository';
import { AuthService } from '@modules/auth/application/services/auth.service';
import { UserService } from '@modules/auth/application/services/user.service';
import { RoleService } from '@modules/auth/application/services/role.service';
import { CompanyService } from '@modules/company/application/services/company.service';
import { EmployeeService } from '@modules/employee/application/services/employee.service';
import { AttendanceService } from '@modules/attendance/application/services/attendance.service';
import { DashboardService } from '@modules/dashboard/application/services/dashboard.service';
import { FinanceService } from '@modules/finance/application/services/finance.service';
import { TravelService } from '@modules/travel/application/services/travel.service';
import { ProposalService } from '@modules/travel/application/services/proposal.service';
import { ServiceService } from '@modules/service/application/services/service.service';
import { CustomerService } from '@modules/customer/application/services/customer.service';
import { ReportService } from '@modules/finance/application/services/report.service';
import { ReceiptService } from '@modules/finance/application/services/receipt.service';
import { InvoiceService } from '@modules/finance/application/services/invoice.service';
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
  const bankAccountRepository = new BankAccountRepository();
  const travelRepository = new TravelRepository();
  const serviceRepository = new ServiceRepository();
  const customerRepository = new CustomerRepository();
  const receiptRepository = new ReceiptRepository();
  const invoiceRepository = new InvoiceRepository();

  Container.register('UserRepository', userRepository);
  Container.register('RoleRepository', roleRepository);
  Container.register('CompanyRepository', companyRepository);
  Container.register('EmployeeRepository', employeeRepository);
  Container.register('AttendanceRepository', attendanceRepository);
  Container.register('TransactionRepository', transactionRepository);
  Container.register('BankAccountRepository', bankAccountRepository);
  Container.register('TravelRepository', travelRepository);
  Container.register('ServiceRepository', serviceRepository);
  Container.register('CustomerRepository', customerRepository);
  Container.register('ReceiptRepository', receiptRepository);
  Container.register('InvoiceRepository', invoiceRepository);

  // Services
  const emailService = new EmailService();
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
  const financeService = new FinanceService(transactionRepository, bankAccountRepository);
  const travelService = new TravelService(travelRepository, transactionRepository);
  const proposalService = new ProposalService(emailService);
  const serviceService = new ServiceService(serviceRepository);
  const customerService = new CustomerService(customerRepository);
  const reportService = new ReportService();
  const receiptService = new ReceiptService(receiptRepository);
  const invoiceService = new InvoiceService(invoiceRepository);
  const auditService = new AuditService();
  const notificationService = new NotificationService();

  Container.register('EmailService', emailService);
  Container.register('AuthService', authService);
  Container.register('UserService', userService);
  Container.register('RoleService', roleService);
  Container.register('CompanyService', companyService);
  Container.register('EmployeeService', employeeService);
  Container.register('AttendanceService', attendanceService);
  Container.register('DashboardService', dashboardService);
  Container.register('FinanceService', financeService);
  Container.register('TravelService', travelService);
  Container.register('ProposalService', proposalService);
  Container.register('ServiceService', serviceService);
  Container.register('CustomerService', customerService);
  Container.register('ReportService', reportService);
  Container.register('ReceiptService', receiptService);
  Container.register('InvoiceService', invoiceService);
  Container.register('AuditService', auditService);
  Container.register('NotificationService', notificationService);
}
export { Container };
