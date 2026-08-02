import { getTestAgent } from '../helpers/testApp';
import { CompanyModel } from '../../src/modules/company/infrastructure/models/Company.model';
import { RoleModel } from '../../src/modules/auth/infrastructure/models/Role.model';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import { BankAccountModel } from '../../src/modules/finance/infrastructure/models/BankAccount.model';
import { ServiceModel } from '../../src/modules/service/infrastructure/models/Service.model';
import { CustomerModel } from '../../src/modules/customer/infrastructure/models/Customer.model';
import bcrypt from 'bcrypt';

describe('Phase 7: Extended Operations Integration Tests', () => {
  let adminToken: string;
  let companyId: string;

  beforeEach(async () => {
    // 1. Seed Company
    const company = await CompanyModel.create({ name: 'Apex Corp', code: 'APEX' });
    companyId = company._id.toString();

    // 2. Seed Super Admin Role & User
    const role = await RoleModel.create({
      name: 'Super Admin',
      description: 'Super Admin privileges',
      permissions: ['manage_finance', 'view_finance', 'manage_services', 'view_services'],
    });

    const hashedPassword = await bcrypt.hash('adminpassword', 10);
    const user = await UserModel.create({
      email: 'admin@apex.com',
      passwordHash: hashedPassword,
      roleId: role._id,
      isSuperAdmin: true,
      companyId: company._id,
      currentCompanyId: company._id,
    });

    // 3. Login to get token
    const res = await getTestAgent().post('/api/v1/auth/login').send({
      email: 'admin@apex.com',
      password: 'adminpassword',
    });

    adminToken = res.body.data.accessToken;
  });

  describe('Service Management & Knowledge Base', () => {
    it('should create and retrieve a service with FAQ items', async () => {
      const res = await getTestAgent()
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-company-id', companyId)
        .send({
          serviceName: 'VAT Filing Service',
          category: 'Tax & Accounting',
          description: 'Quarterly corporate VAT submissions',
          price: 500,
          processingTime: '5 business days',
          requiredDocuments: ['Sales Ledger', 'Purchase Ledger', 'VAT Certificate'],
          governmentFees: 50,
          companyServiceCharge: 450,
          stepsToApply: ['Upload logs', 'Reconcile accounts', 'Submit declaration'],
          faqs: [
            { question: 'When is the deadline?', answer: '28 days after quarter end' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.serviceName).toBe('VAT Filing Service');
      expect(res.body.data.faqs[0].question).toBe('When is the deadline?');

      const getRes = await getTestAgent()
        .get(`/api/v1/services/${res.body.data._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-company-id', companyId);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.serviceName).toBe('VAT Filing Service');
    });
  });

  describe('Multi-Bank Account Tracking', () => {
    it('should track ledger transactions and adjust bank account balance dynamically', async () => {
      // 1. Create a bank account
      const bankRes = await getTestAgent()
        .post('/api/v1/finance/bank-accounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-company-id', companyId)
        .send({
          bankName: 'HSBC',
          accountName: 'Corporate Operating',
          accountNumber: '123-456-789',
          currentBalance: 1000,
        });

      expect(bankRes.status).toBe(201);
      expect(bankRes.body.data.currentBalance).toBe(1000);
      const bankAccountId = bankRes.body.data._id;

      // 2. Create completed income transaction linked to this account
      const txRes = await getTestAgent()
        .post('/api/v1/finance/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-company-id', companyId)
        .send({
          type: 'income',
          category: 'Sales',
          amount: 250,
          paymentMethod: 'bank_transfer',
          status: 'completed',
          bankAccountId: bankAccountId,
        });

      expect(txRes.status).toBe(201);

      // Verify bank account balance is incremented
      const bankState = await BankAccountModel.findById(bankAccountId);
      expect(bankState?.currentBalance).toBe(1250);
    });
  });

  describe('GridFS Document Stream & Uploads', () => {
    it('should upload a mock passport text file and stream it back', async () => {
      const uploadRes = await getTestAgent()
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-company-id', companyId)
        .attach('file', Buffer.from('mock passport info'), 'passport.txt');

      expect(uploadRes.status).toBe(201);
      expect(uploadRes.body.data.fileId).toBeDefined();

      const downloadRes = await getTestAgent()
        .get(`/api/v1/documents/${uploadRes.body.data.fileId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-company-id', companyId);

      expect(downloadRes.status).toBe(200);
      expect(downloadRes.text).toBe('mock passport info');
    });
  });

  describe('Global Instant Search Engine', () => {
    it('should retrieve matches across multiple models on query trigger', async () => {
      // Seed a customer
      await CustomerModel.create({
        companyId: companyId,
        name: 'Haneen Teqno',
        email: 'haneen@teqno.com',
        status: 'new_lead',
        documents: [],
      });

      const searchRes = await getTestAgent()
        .get('/api/v1/search?q=Haneen')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-company-id', companyId);

      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.customers.length).toBeGreaterThan(0);
      expect(searchRes.body.data.customers[0].name).toBe('Haneen Teqno');
    });
  });

  describe('Bulk CSV Ingestions', () => {
    it('should parse and import a batch customer list', async () => {
      const csvContent = 'name,email,phone,country\nAlice Smith,alice@example.com,+12345,UAE\nBob Jones,bob@example.com,+67890,India';

      const importRes = await getTestAgent()
        .post('/api/v1/import/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-company-id', companyId)
        .attach('file', Buffer.from(csvContent), 'customers.csv');

      expect(importRes.status).toBe(200);
      expect(importRes.body.data.count).toBe(2);

      const customerCheck = await CustomerModel.findOne({ email: 'alice@example.com' });
      expect(customerCheck).toBeDefined();
      expect(customerCheck?.name).toBe('Alice Smith');
    });
  });
});
