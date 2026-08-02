import { getTestAgent } from '../helpers/testApp';
import { CompanyModel } from '../../src/modules/company/infrastructure/models/Company.model';
import { RoleModel } from '../../src/modules/auth/infrastructure/models/Role.model';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import bcrypt from 'bcrypt';
import { Types } from 'mongoose';

describe('Finance & Accounting Integration Tests', () => {
  let financeToken: string;
  let companyId: string;

  beforeEach(async () => {
    // 1. Seed Company
    const company = await CompanyModel.create({ name: 'Finance Corp', code: 'FINCORP' });
    companyId = company._id.toString();

    // 2. Seed Finance Role
    const role = await RoleModel.create({
      name: 'Finance Manager',
      description: 'Manages ledger and accounts',
      permissions: ['view_finance', 'manage_finance'],
      companyId: company._id as Types.ObjectId,
    });

    // 3. Seed User
    const passwordHash = await bcrypt.hash('password123', 10);
    await UserModel.create({
      email: 'accountant@fincorp.com',
      passwordHash,
      isSuperAdmin: false,
      companyId: company._id as Types.ObjectId,
      roleId: role._id as Types.ObjectId,
    });

    // Login Accountant
    const loginRes = await getTestAgent().post('/api/v1/auth/login').send({
      email: 'accountant@fincorp.com',
      password: 'password123',
    });
    financeToken = loginRes.body.data.accessToken;
  });

  describe('Ledger CRUD Operations', () => {
    it('should create income and expense transactions', async () => {
      // 1. Create Income
      const incRes = await getTestAgent()
        .post('/api/v1/finance/transactions')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          type: 'income',
          category: 'consulting',
          amount: 5000,
          taxAmount: 250,
          paymentMethod: 'bank_transfer',
          reference: 'INV-2026-001',
          description: 'Consulting services payment',
        });

      expect(incRes.status).toBe(201);
      expect(incRes.body.success).toBe(true);
      expect(incRes.body.data.type).toBe('income');
      expect(incRes.body.data.amount).toBe(5000);

      // 2. Create Expense
      const expRes = await getTestAgent()
        .post('/api/v1/finance/transactions')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          type: 'expense',
          category: 'rent',
          amount: 1500,
          taxAmount: 0,
          paymentMethod: 'bank_transfer',
          reference: 'RENT-AUG',
          description: 'Office rent August',
        });

      expect(expRes.status).toBe(201);
      expect(expRes.body.data.type).toBe('expense');
      expect(expRes.body.data.amount).toBe(1500);

      // 3. List Transactions
      const listRes = await getTestAgent()
        .get('/api/v1/finance/transactions')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(2);
    });
  });

  describe('Statements & Reports Calculations', () => {
    beforeEach(async () => {
      // Seed transactions
      await getTestAgent()
        .post('/api/v1/finance/transactions')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          type: 'income',
          category: 'consulting',
          amount: 8000,
          paymentMethod: 'bank_transfer',
          date: '2026-08-01',
        });

      await getTestAgent()
        .post('/api/v1/finance/transactions')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          type: 'expense',
          category: 'supplies',
          amount: 2000,
          paymentMethod: 'cash',
          date: '2026-08-02',
        });
    });

    it('should compute Profit & Loss (P&L) correctly', async () => {
      const response = await getTestAgent()
        .get('/api/v1/finance/reports/profit-loss')
        .set('Authorization', `Bearer ${financeToken}`)
        .query({
          startDate: '2026-08-01',
          endDate: '2026-08-03',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalRevenue).toBe(8000);
      expect(response.body.data.totalExpenses).toBe(2000);
      expect(response.body.data.netProfit).toBe(6000);
    });

    it('should compute Cash Flow statement correctly', async () => {
      const response = await getTestAgent()
        .get('/api/v1/finance/reports/cash-flow')
        .set('Authorization', `Bearer ${financeToken}`)
        .query({
          startDate: '2026-08-01',
          endDate: '2026-08-03',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.netCashFlow).toBe(6000);
      expect(response.body.data.inflow.total).toBe(8000);
      expect(response.body.data.outflow.total).toBe(2000);
    });
  });
});
