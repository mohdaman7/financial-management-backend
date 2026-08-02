import { getTestAgent } from '../helpers/testApp';
import { CompanyModel } from '../../src/modules/company/infrastructure/models/Company.model';
import { RoleModel } from '../../src/modules/auth/infrastructure/models/Role.model';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import { NotificationModel } from '../../src/modules/notification/infrastructure/models/Notification.model';
import { TransactionModel } from '../../src/modules/finance/infrastructure/models/Transaction.model';
import bcrypt from 'bcrypt';
import { Types } from 'mongoose';

describe('Operations, Auditing, Exports and Notifications Tests', () => {
  let employeeToken: string;
  let superAdminToken: string;
  let companyId: string;
  let employeeUserId: string;

  beforeEach(async () => {
    // 1. Seed Company
    const company = await CompanyModel.create({ name: 'Ops Corp', code: 'OPSC' });
    companyId = company._id.toString();

    // 2. Seed Employee Role
    const employeeRole = await RoleModel.create({
      name: 'Operations Staff',
      description: 'Performs operations and updates',
      permissions: ['view_travel', 'manage_travel', 'view_finance'],
      companyId: company._id as Types.ObjectId,
    });

    const passwordHash = await bcrypt.hash('password123', 10);

    // 3. Seed Employee User
    const employeeUser = await UserModel.create({
      email: 'ops@opscorp.com',
      passwordHash,
      isSuperAdmin: false,
      companyId: company._id as Types.ObjectId,
      roleId: employeeRole._id as Types.ObjectId,
    });
    employeeUserId = employeeUser._id.toString();

    // 4. Seed Super Admin User
    await UserModel.create({
      email: 'admin@opscorp.com',
      passwordHash,
      isSuperAdmin: true,
      currentCompanyId: company._id as Types.ObjectId,
    });

    // Login Employee
    const empLogin = await getTestAgent().post('/api/v1/auth/login').send({
      email: 'ops@opscorp.com',
      password: 'password123',
    });
    employeeToken = empLogin.body.data.accessToken;

    // Login Super Admin
    const adminLogin = await getTestAgent().post('/api/v1/auth/login').send({
      email: 'admin@opscorp.com',
      password: 'password123',
    });
    superAdminToken = adminLogin.body.data.accessToken;
  });

  describe('Global Audit Logging Middleware', () => {
    it('should automatically write log on successful mutating action and deny regular employee access', async () => {
      // 1. Perform mutating action (e.g. POST customer)
      const postRes = await getTestAgent()
        .post('/api/v1/travel/customers')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          name: 'Alice Cooper',
          email: 'alice@opscorp.com',
        });
      expect(postRes.status).toBe(201);

      // 2. Try fetching audit logs as regular employee (should fail with 403 / insufficient permissions)
      const failLogs = await getTestAgent()
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(failLogs.status).toBe(403);

      // 3. Fetch audit logs as Super Admin (should succeed and contain mutating operation)
      const successLogs = await getTestAgent()
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(successLogs.status).toBe(200);
      expect(successLogs.body.success).toBe(true);
      expect(successLogs.body.data.length).toBeGreaterThanOrEqual(1);

      const log = successLogs.body.data.find((l: any) => l.action.includes('POST /api/v1/travel/customers'));
      expect(log).toBeDefined();
      expect(log.userId.email).toBe('ops@opscorp.com');
    });
  });

  describe('Notifications Module', () => {
    it('should list notifications and mark them as read', async () => {
      // 1. Seed a Notification
      const notification = await NotificationModel.create({
        companyId: new Types.ObjectId(companyId),
        userId: new Types.ObjectId(employeeUserId),
        title: 'New Booking Request',
        message: 'A new visa application has been requested.',
        isRead: false,
      });

      // 2. Fetch Notifications
      const listRes = await getTestAgent()
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

      // 3. Mark notification as read
      const readRes = await getTestAgent()
        .put(`/api/v1/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(readRes.status).toBe(200);
      expect(readRes.body.data.isRead).toBe(true);
    });
  });

  describe('CSV Exports', () => {
    beforeEach(async () => {
      // Seed completed financial transactions
      await TransactionModel.create({
        companyId: new Types.ObjectId(companyId),
        type: 'income',
        category: 'consulting',
        amount: 6000,
        paymentMethod: 'bank_transfer',
        status: 'completed',
        date: new Date('2026-08-01'),
      });
      await TransactionModel.create({
        companyId: new Types.ObjectId(companyId),
        type: 'expense',
        category: 'rent',
        amount: 2000,
        paymentMethod: 'bank_transfer',
        status: 'completed',
        date: new Date('2026-08-01'),
      });
    });

    it('should export Profit & Loss statement as a CSV attachment', async () => {
      const res = await getTestAgent()
        .get('/api/v1/finance/reports/profit-loss/export')
        .set('Authorization', `Bearer ${employeeToken}`)
        .query({
          startDate: '2026-08-01',
          endDate: '2026-08-03',
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.text).toContain('Profit & Loss Statement');
      expect(res.text).toContain('REVENUE');
      expect(res.text).toContain('consulting,6000.00');
      expect(res.text).toContain('Total Revenue,6000.00');
      expect(res.text).toContain('EXPENSES');
      expect(res.text).toContain('rent,2000.00');
      expect(res.text).toContain('Total Expenses,2000.00');
      expect(res.text).toContain('Net Profit,4000.00');
    });

    it('should export Cash Flow statement as a CSV attachment', async () => {
      const res = await getTestAgent()
        .get('/api/v1/finance/reports/cash-flow/export')
        .set('Authorization', `Bearer ${employeeToken}`)
        .query({
          startDate: '2026-08-01',
          endDate: '2026-08-03',
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.text).toContain('Cash Flow Statement');
      expect(res.text).toContain('CASH INFLOWS');
      expect(res.text).toContain('Total Inflow,6000.00');
      expect(res.text).toContain('CASH OUTFLOWS');
      expect(res.text).toContain('Total Outflow,2000.00');
      expect(res.text).toContain('Net Cash Flow,4000.00');
    });
  });
});
