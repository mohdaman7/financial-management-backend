import { getTestAgent } from '../helpers/testApp';
import { Types } from 'mongoose';
import { CompanyModel } from '../../src/modules/company/infrastructure/models/Company.model';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import { RoleModel } from '../../src/modules/auth/infrastructure/models/Role.model';
import { ReceiptModel } from '../../src/modules/finance/infrastructure/models/Receipt.model';
import { InvoiceModel } from '../../src/modules/finance/infrastructure/models/Invoice.model';
import { BankAccountModel } from '../../src/modules/finance/infrastructure/models/BankAccount.model';
import { CustomerModel } from '../../src/modules/customer/infrastructure/models/Customer.model';
import bcrypt from 'bcrypt';

describe('Advance Payments API Endpoint & FIFO Calculation Engine', () => {
  let authToken: string;
  let companyId: Types.ObjectId;
  let otherCompanyId: Types.ObjectId;
  let customer1Id: Types.ObjectId;
  let customer2Id: Types.ObjectId;

  beforeEach(async () => {
    // 1. Primary Tenant Company
    const company = await CompanyModel.create({
      name: 'Skyfall Luxury Travel LLC',
      code: `SKY-${Date.now()}`,
    });
    companyId = company._id as Types.ObjectId;

    // 2. Secondary Tenant Company (for multi-tenant isolation tests)
    const otherCompany = await CompanyModel.create({
      name: 'Competing Travel Corp',
      code: `OTHER-${Date.now()}`,
    });
    otherCompanyId = otherCompany._id as Types.ObjectId;

    // 3. Bank Account
    await BankAccountModel.create({
      companyId,
      bankName: 'Emirates NBD',
      accountName: 'Corporate Operating Account',
      accountNumber: 'AE888812345678901234567',
      currentBalance: 100000,
      currency: 'AED',
      status: 'active',
    });

    // 4. Role and User Authentication
    const role = await RoleModel.create({
      name: 'Finance Controller',
      description: 'Head of Accounts',
      permissions: ['view_finance', 'manage_finance'],
      companyId,
    });

    const passwordHash = await bcrypt.hash('password123', 10);
    await UserModel.create({
      name: 'Finance Manager',
      email: 'finance.manager@skyfall.ae',
      passwordHash,
      role: 'admin',
      isSuperAdmin: false,
      companyId,
      roleId: role._id,
    });

    const loginRes = await getTestAgent().post('/api/v1/auth/login').send({
      email: 'finance.manager@skyfall.ae',
      password: 'password123',
    });
    authToken = loginRes.body.data.accessToken;

    // 5. Customers
    const c1 = await CustomerModel.create({
      companyId,
      name: 'SALKJSADLK',
      email: 'salkjsadlk@test.com',
      total_spent: 0,
    });
    customer1Id = c1._id as Types.ObjectId;

    const c2 = await CustomerModel.create({
      companyId,
      name: 'Alpha Corporate Client',
      email: 'alpha@corporate.com',
      total_spent: 0,
    });
    customer2Id = c2._id as Types.ObjectId;

    // 6. Seed Invoices for Customer 1 (SALKJSADLK):
    // - Invoice 1 on 2026-09-01: 300 AED
    await InvoiceModel.create({
      companyId,
      invoice_number: 'INV-2026-001',
      customer_id: customer1Id,
      customer_name: 'SALKJSADLK',
      issue_date: '2026-09-01',
      due_date: '2026-09-10',
      grand_total: 300,
      lead_by: 'Agent John',
      status: 'Pending',
    });

    // 7. Seed Receipts for Customer 1:
    // - Receipt 1 on 2026-09-03: 1000 AED
    //   FIFO Allocation: covers INV-2026-001 (300 AED).
    //   Allocated: 300 AED, Unallocated Balance: 700 AED -> Status: Partially Allocated
    await ReceiptModel.create({
      companyId,
      customerId: customer1Id,
      customerName: 'SALKJSADLK',
      reference: 'REC-2026-001',
      amount: 1000,
      paymentMethod: 'Bank Transfer',
      currency: 'AED',
      date: '2026-09-03',
      transaction_reference: 'TXN-REF-1001',
      status: 'Received',
    });

    // 8. Seed Receipts for Customer 2 (Alpha Corporate Client):
    // - Customer 2 has no invoices.
    // - Receipt 2 on 2026-09-05: 2500 AED
    //   FIFO Allocation: Allocated: 0 AED, Unallocated Balance: 2500 AED -> Status: Unallocated
    await ReceiptModel.create({
      companyId,
      customerId: customer2Id,
      customerName: 'Alpha Corporate Client',
      reference: 'REC-2026-002',
      amount: 2500,
      paymentMethod: 'Card',
      currency: 'AED',
      date: '2026-09-05',
      transaction_reference: 'TXN-REF-1002',
      status: 'Received',
    });

    // 9. Customer 3: Fully Allocated test
    const c3 = await CustomerModel.create({
      companyId,
      name: 'Beta Trading Co',
      email: 'beta@trading.com',
      total_spent: 0,
    });

    // Invoice 2 on 2026-09-02: 500 AED
    await InvoiceModel.create({
      companyId,
      invoice_number: 'INV-2026-002',
      customer_id: c3._id,
      customer_name: 'Beta Trading Co',
      issue_date: '2026-09-02',
      due_date: '2026-09-12',
      grand_total: 500,
      lead_by: 'Agent Alice',
      status: 'Paid',
    });

    // Receipt 3 on 2026-09-04: 500 AED -> Allocated: 500, Unallocated: 0 -> Fully Allocated
    await ReceiptModel.create({
      companyId,
      customerId: c3._id,
      customerName: 'Beta Trading Co',
      reference: 'REC-2026-003',
      amount: 500,
      paymentMethod: 'Online Payment',
      currency: 'AED',
      date: '2026-09-04',
      transaction_reference: 'TXN-REF-1003',
      status: 'Received',
    });

    // 10. Seed Other Company's Receipt (Multi-Tenant Isolation Check)
    await ReceiptModel.create({
      companyId: otherCompanyId,
      customerName: 'Isolated Other Client',
      reference: 'REC-OTHER-999',
      amount: 99999,
      paymentMethod: 'Cash',
      currency: 'AED',
      date: '2026-09-03',
      status: 'Received',
    });
  });

  describe('GET /api/v1/finance/advance-payments', () => {
    it('1. should return 200 OK with correct summary, pagination, and calculated advances', async () => {
      const res = await getTestAgent()
        .get('/api/v1/finance/advance-payments')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId.toString());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Advance payments fetched successfully');
      expect(res.body.data).toBeDefined();

      const { summary, pagination, advances } = res.body.data;

      // Summary KPIs verification:
      // Total received = 1000 + 2500 + 500 = 4000.00
      // Allocated = 300 (SALKJSADLK) + 0 (Alpha) + 500 (Beta) = 800.00
      // Unallocated = 700 + 2500 + 0 = 3200.00
      expect(summary.totalReceived).toBe(4000.0);
      expect(summary.allocatedAmount).toBe(800.0);
      expect(summary.unallocatedBalance).toBe(3200.0);
      expect(summary.currency).toBe('AED');

      // Pagination verification
      expect(pagination.totalRecords).toBe(3);
      expect(pagination.currentPage).toBe(1);
      expect(pagination.limit).toBe(50);
      expect(pagination.totalPages).toBe(1);

      // Advances list verification (sorted newest first)
      expect(advances).toHaveLength(3);
      expect(advances[0].id).toBe('ADV-01');
      expect(advances[0].customerName).toBe('Alpha Corporate Client');
      expect(advances[0].totalReceived).toBe(2500.0);
      expect(advances[0].allocatedAmount).toBe(0.0);
      expect(advances[0].unallocatedBalance).toBe(2500.0);
      expect(advances[0].status).toBe('Unallocated');

      expect(advances[1].id).toBe('ADV-02');
      expect(advances[1].customerName).toBe('Beta Trading Co');
      expect(advances[1].totalReceived).toBe(500.0);
      expect(advances[1].allocatedAmount).toBe(500.0);
      expect(advances[1].unallocatedBalance).toBe(0.0);
      expect(advances[1].status).toBe('Fully Allocated');

      expect(advances[2].id).toBe('ADV-03');
      expect(advances[2].customerName).toBe('SALKJSADLK');
      expect(advances[2].totalReceived).toBe(1000.0);
      expect(advances[2].allocatedAmount).toBe(300.0);
      expect(advances[2].unallocatedBalance).toBe(700.0);
      expect(advances[2].status).toBe('Partially Allocated');
      expect(advances[2].referenceTransaction).toBe('TXN-REF-1001');
    });

    it('2. should support alternative endpoint GET /api/v1/advance-payments', async () => {
      const res = await getTestAgent()
        .get('/api/v1/advance-payments')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId.toString());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.advances).toHaveLength(3);
      expect(res.body.data.summary.totalReceived).toBe(4000.0);
    });

    it('3. should filter by status=unallocated', async () => {
      const res = await getTestAgent()
        .get('/api/v1/finance/advance-payments?status=unallocated')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId.toString());

      expect(res.status).toBe(200);
      const { summary, pagination, advances } = res.body.data;
      expect(advances).toHaveLength(1);
      expect(advances[0].customerName).toBe('Alpha Corporate Client');
      expect(advances[0].status).toBe('Unallocated');
      expect(summary.totalReceived).toBe(2500.0);
      expect(summary.allocatedAmount).toBe(0.0);
      expect(summary.unallocatedBalance).toBe(2500.0);
      expect(pagination.totalRecords).toBe(1);
    });

    it('4. should filter by status=partially_allocated', async () => {
      const res = await getTestAgent()
        .get('/api/v1/finance/advance-payments?status=partially_allocated')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId.toString());

      expect(res.status).toBe(200);
      const { summary, pagination, advances } = res.body.data;
      expect(advances).toHaveLength(1);
      expect(advances[0].customerName).toBe('SALKJSADLK');
      expect(advances[0].status).toBe('Partially Allocated');
      expect(summary.totalReceived).toBe(1000.0);
      expect(summary.allocatedAmount).toBe(300.0);
      expect(summary.unallocatedBalance).toBe(700.0);
      expect(pagination.totalRecords).toBe(1);
    });

    it('5. should filter by status=fully_allocated', async () => {
      const res = await getTestAgent()
        .get('/api/v1/finance/advance-payments?status=fully_allocated')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId.toString());

      expect(res.status).toBe(200);
      const { summary, pagination, advances } = res.body.data;
      expect(advances).toHaveLength(1);
      expect(advances[0].customerName).toBe('Beta Trading Co');
      expect(advances[0].status).toBe('Fully Allocated');
      expect(summary.totalReceived).toBe(500.0);
      expect(summary.allocatedAmount).toBe(500.0);
      expect(summary.unallocatedBalance).toBe(0.0);
      expect(pagination.totalRecords).toBe(1);
    });

    it('6. should filter by startDate and endDate', async () => {
      const res = await getTestAgent()
        .get('/api/v1/finance/advance-payments?startDate=2026-09-04&endDate=2026-09-05')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId.toString());

      expect(res.status).toBe(200);
      const { advances, pagination, summary } = res.body.data;
      expect(advances).toHaveLength(2);
      expect(pagination.totalRecords).toBe(2);
      expect(summary.totalReceived).toBe(3000.0); // 2500 + 500
    });

    it('7. should filter by search term matching customer name or transaction reference', async () => {
      const res = await getTestAgent()
        .get('/api/v1/finance/advance-payments?search=SALKJSADLK')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId.toString());

      expect(res.status).toBe(200);
      const { advances } = res.body.data;
      expect(advances).toHaveLength(1);
      expect(advances[0].customerName).toBe('SALKJSADLK');
    });

    it('8. should enforce strict multi-tenant isolation via x-company-id', async () => {
      const res = await getTestAgent()
        .get('/api/v1/finance/advance-payments')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId.toString());

      expect(res.status).toBe(200);
      const names = res.body.data.advances.map((a: any) => a.customerName);
      expect(names).not.toContain('Isolated Other Client');
    });

    it('9. should paginate records correctly with page and limit parameters', async () => {
      const res = await getTestAgent()
        .get('/api/v1/finance/advance-payments?page=2&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId.toString());

      expect(res.status).toBe(200);
      const { pagination, advances } = res.body.data;
      expect(pagination.totalRecords).toBe(3);
      expect(pagination.currentPage).toBe(2);
      expect(pagination.totalPages).toBe(2);
      expect(pagination.limit).toBe(2);
      expect(advances).toHaveLength(1);
      expect(advances[0].id).toBe('ADV-03');
    });

    it('10. should return 401 Unauthorized when auth token is missing', async () => {
      const res = await getTestAgent()
        .get('/api/v1/finance/advance-payments')
        .set('x-company-id', companyId.toString());

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('11. should return 400 Bad Request when startDate is invalid', async () => {
      const res = await getTestAgent()
        .get('/api/v1/finance/advance-payments?startDate=invalid-date')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId.toString());

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('12. should return 400 Bad Request when endDate is invalid', async () => {
      const res = await getTestAgent()
        .get('/api/v1/finance/advance-payments?endDate=09/03/2026')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId.toString());

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
