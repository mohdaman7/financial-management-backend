import { getTestAgent } from '../helpers/testApp';
import { CompanyModel } from '../../src/modules/company/infrastructure/models/Company.model';
import { RoleModel } from '../../src/modules/auth/infrastructure/models/Role.model';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import { CustomerModel } from '../../src/modules/customer/infrastructure/models/Customer.model';
import { InvoiceModel } from '../../src/modules/finance/infrastructure/models/Invoice.model';
import { ReceiptModel } from '../../src/modules/finance/infrastructure/models/Receipt.model';
import bcrypt from 'bcrypt';
import { Types } from 'mongoose';

describe('Customer Account & Financial Ledger API Tests', () => {
  let authToken: string;
  let companyId: string;
  let customerId: string;

  beforeEach(async () => {
    // 1. Seed Company
    const company = await CompanyModel.create({ name: 'Skyfall Travels', code: 'TRAVELS' });
    companyId = (company._id as Types.ObjectId).toString();

    // 2. Seed Role & User
    const role = await RoleModel.create({
      name: 'Finance Executive',
      description: 'Manages ledger and accounts',
      permissions: ['manage_customers', 'view_customers', 'manage_finance', 'view_finance'],
      companyId: company._id as Types.ObjectId,
    });

    const passwordHash = await bcrypt.hash('password123', 10);
    await UserModel.create({
      email: 'finance@skyfall.com',
      passwordHash,
      isSuperAdmin: false,
      companyId: company._id as Types.ObjectId,
      roleId: role._id as Types.ObjectId,
    });

    // 3. Login
    const loginRes = await getTestAgent().post('/api/v1/auth/login').send({
      email: 'finance@skyfall.com',
      password: 'password123',
    });
    authToken = loginRes.body.data.accessToken;

    // 4. Create Customer
    const customer = await CustomerModel.create({
      name: 'Nithin paul volga',
      email: 'nithin@example.com',
      phone: '+971501234567',
      companyId: company._id as Types.ObjectId,
      status: 'active',
      opening_balance: 0,
    });
    customerId = (customer._id as Types.ObjectId).toString();
  });

  describe('GET /api/v1/customers/:id/financial-summary', () => {
    it('should retrieve real-time financial summary with advance credit', async () => {
      // Create 1 Invoice for AED 544.00
      await InvoiceModel.create({
        companyId: new Types.ObjectId(companyId),
        invoice_number: 'INV-2026-001',
        customer_id: new Types.ObjectId(customerId),
        customer_name: 'Nithin paul volga',
        issue_date: '2026-08-10',
        due_date: '2026-08-20',
        grand_total: 544.0,
        subtotal: 544.0,
        paid_amount: 0,
        balance_amount: 544.0,
        status: 'Pending',
        lead_by: 'Sameer',
        items: [{ description: 'Investor Visa & Express Processing Fee', qty: 1, rate: 544 }],
      });

      // Create 1 Receipt for AED 1544.00
      await ReceiptModel.create({
        companyId: new Types.ObjectId(companyId),
        customerId: new Types.ObjectId(customerId),
        customerName: 'Nithin paul volga',
        reference: 'REC-2026-089',
        amount: 1544.0,
        date: '2026-08-15',
        paymentMethod: 'Bank Transfer',
        status: 'Received',
        unallocated_amount: 1544.0,
        allocations: [],
      });

      const res = await getTestAgent()
        .get(`/api/v1/customers/${customerId}/financial-summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        customerId,
        customerName: 'Nithin paul volga',
        currency: 'AED',
        totalBilledDebit: 544.0,
        totalReceivedCredit: 1544.0,
        outstandingDues: 0.0,
        remainingAdvanceCredit: 1000.0,
        accountStatus: 'SETTLED_AND_CREDIT_AVAILABLE',
        metricsCount: {
          totalInvoices: 1,
          totalReceipts: 1,
        },
        lastTransactionDate: '2026-08-15',
      });
    });

    it('should return DUE_OUTSTANDING when debit exceeds credit', async () => {
      await InvoiceModel.create({
        companyId: new Types.ObjectId(companyId),
        invoice_number: 'INV-2026-002',
        customer_id: new Types.ObjectId(customerId),
        customer_name: 'Nithin paul volga',
        issue_date: '2026-08-10',
        due_date: '2026-08-20',
        grand_total: 2000.0,
        subtotal: 2000.0,
        paid_amount: 500.0,
        balance_amount: 1500.0,
        status: 'Partially Paid',
        lead_by: 'Sameer',
        items: [{ description: 'Corporate Setup', qty: 1, rate: 2000 }],
      });

      await ReceiptModel.create({
        companyId: new Types.ObjectId(companyId),
        customerId: new Types.ObjectId(customerId),
        customerName: 'Nithin paul volga',
        reference: 'REC-2026-002',
        amount: 500.0,
        date: '2026-08-11',
        paymentMethod: 'Cash',
        status: 'Received',
        unallocated_amount: 0,
      });

      const res = await getTestAgent()
        .get(`/api/v1/customers/${customerId}/financial-summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId);

      expect(res.status).toBe(200);
      expect(res.body.data.totalBilledDebit).toBe(2000.0);
      expect(res.body.data.totalReceivedCredit).toBe(500.0);
      expect(res.body.data.outstandingDues).toBe(1500.0);
      expect(res.body.data.remainingAdvanceCredit).toBe(0.0);
      expect(res.body.data.accountStatus).toBe('DUE_OUTSTANDING');
    });

    it('should return 404 CUSTOM_NOT_FOUND if customer does not exist', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const res = await getTestAgent()
        .get(`/api/v1/customers/${nonExistentId}/financial-summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CUSTOMER_NOT_FOUND');
    });
  });

  describe('GET /api/v1/customers/:id/ledger', () => {
    it('should retrieve chronological ledger with running balance and summary', async () => {
      // 1. Invoice on 2026-08-10
      await InvoiceModel.create({
        companyId: new Types.ObjectId(companyId),
        invoice_number: 'INV-2026-001',
        customer_id: new Types.ObjectId(customerId),
        customer_name: 'Nithin paul volga',
        issue_date: '2026-08-10',
        due_date: '2026-08-20',
        grand_total: 544.0,
        subtotal: 544.0,
        paid_amount: 544.0,
        balance_amount: 0,
        status: 'Paid',
        lead_by: 'Sameer',
        items: [{ description: 'Investor Visa & Express Processing Fee', qty: 1, rate: 544 }],
      });

      // 2. Receipt on 2026-08-15
      await ReceiptModel.create({
        companyId: new Types.ObjectId(companyId),
        customerId: new Types.ObjectId(customerId),
        customerName: 'Nithin paul volga',
        reference: 'REC-2026-089',
        amount: 1544.0,
        date: '2026-08-15',
        paymentMethod: 'Bank Transfer',
        notes: 'Bank Transfer - Advance Payment',
        status: 'Received',
        unallocated_amount: 1000.0,
      });

      const res = await getTestAgent()
        .get(`/api/v1/customers/${customerId}/ledger`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(2);

      // Verify row 1: invoice
      expect(res.body.data[0]).toMatchObject({
        date: '2026-08-10',
        refNo: 'INV-2026-001',
        type: 'invoice',
        debit: 544.0,
        credit: 0.0,
        runningBalance: 544.0,
      });

      // Verify row 2: receipt
      expect(res.body.data[1]).toMatchObject({
        date: '2026-08-15',
        refNo: 'REC-2026-089',
        type: 'receipt',
        debit: 0.0,
        credit: 1544.0,
        runningBalance: -1000.0,
        status: 'advance_credit',
      });

      // Verify summary
      expect(res.body.summary).toMatchObject({
        openingBalance: 0.0,
        totalDebit: 544.0,
        totalCredit: 1544.0,
        closingBalance: -1000.0,
      });

      // Verify pagination
      expect(res.body.pagination).toMatchObject({
        page: 1,
        limit: 50,
        totalRecords: 2,
        totalPages: 1,
      });
    });

    it('should filter ledger by date range and type', async () => {
      await InvoiceModel.create({
        companyId: new Types.ObjectId(companyId),
        invoice_number: 'INV-2026-001',
        customer_id: new Types.ObjectId(customerId),
        customer_name: 'Nithin paul volga',
        issue_date: '2026-08-01',
        due_date: '2026-08-10',
        grand_total: 300.0,
        status: 'Paid',
        lead_by: 'Sameer',
        items: [{ description: 'Visa', qty: 1, rate: 300 }],
      });

      await ReceiptModel.create({
        companyId: new Types.ObjectId(companyId),
        customerId: new Types.ObjectId(customerId),
        customerName: 'Nithin paul volga',
        reference: 'REC-2026-001',
        amount: 300.0,
        date: '2026-08-15',
        paymentMethod: 'Bank Transfer',
        status: 'Received',
      });

      // Filter type=invoice
      const resInvoiceOnly = await getTestAgent()
        .get(`/api/v1/customers/${customerId}/ledger?type=invoice`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId);

      expect(resInvoiceOnly.status).toBe(200);
      expect(resInvoiceOnly.body.data).toHaveLength(1);
      expect(resInvoiceOnly.body.data[0].type).toBe('invoice');

      // Filter date range
      const resDateFiltered = await getTestAgent()
        .get(`/api/v1/customers/${customerId}/ledger?startDate=2026-08-10&endDate=2026-08-20`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId);

      expect(resDateFiltered.status).toBe(200);
      expect(resDateFiltered.body.data).toHaveLength(1);
      expect(resDateFiltered.body.data[0].refNo).toBe('REC-2026-001');
    });
  });

  describe('POST /api/v1/customers/:id/allocate-credit', () => {
    it('should successfully apply available advance credit against an open invoice', async () => {
      // 1. Create Receipt with AED 1500 advance
      await ReceiptModel.create({
        companyId: new Types.ObjectId(companyId),
        customerId: new Types.ObjectId(customerId),
        customerName: 'Nithin paul volga',
        reference: 'REC-ADV-001',
        amount: 1500.0,
        date: '2026-08-01',
        paymentMethod: 'Bank Transfer',
        status: 'Received',
        unallocated_amount: 1500.0,
        allocations: [],
      });

      // 2. Create Unpaid Invoice for AED 500
      const invoice = await InvoiceModel.create({
        companyId: new Types.ObjectId(companyId),
        invoice_number: 'INV-2026-009',
        customer_id: new Types.ObjectId(customerId),
        customer_name: 'Nithin paul volga',
        issue_date: '2026-08-05',
        due_date: '2026-08-15',
        grand_total: 500.0,
        subtotal: 500.0,
        paid_amount: 0,
        balance_amount: 500.0,
        status: 'Pending',
        lead_by: 'Sameer',
        items: [{ description: 'Express Visa Application', qty: 1, rate: 500 }],
      });
      const invoiceId = (invoice._id as Types.ObjectId).toString();

      // 3. Allocate AED 500 from advance credit
      const res = await getTestAgent()
        .post(`/api/v1/customers/${customerId}/allocate-credit`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId)
        .send({
          invoiceId,
          invoiceRef: 'INV-2026-009',
          allocatedAmount: 500.0,
          notes: 'Allocated AED 500 from customer advance credit balance',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        invoiceId,
        allocatedAmount: 500.0,
        invoiceRemainingDue: 0.0,
        customerRemainingAdvanceCredit: 500.0,
        status: 'fully_paid',
      });
      expect(res.body.data.allocationId).toBeDefined();

      // Verify invoice in DB is updated to Paid
      const updatedInvoice = await InvoiceModel.findById(invoiceId);
      expect(updatedInvoice?.paid_amount).toBe(500.0);
      expect(updatedInvoice?.balance_amount).toBe(0.0);
      expect(updatedInvoice?.status).toBe('Paid');

      // Verify receipt unallocated_amount decreased from 1500 to 1000
      const updatedReceipt = await ReceiptModel.findOne({ reference: 'REC-ADV-001' });
      expect(updatedReceipt?.unallocated_amount).toBe(1000.0);
      expect(updatedReceipt?.allocations).toHaveLength(1);
    });

    it('should throw 400 INSUFFICIENT_CREDIT if allocatedAmount exceeds available advance credit', async () => {
      // Create Receipt with AED 200
      await ReceiptModel.create({
        companyId: new Types.ObjectId(companyId),
        customerId: new Types.ObjectId(customerId),
        customerName: 'Nithin paul volga',
        reference: 'REC-ADV-002',
        amount: 200.0,
        date: '2026-08-01',
        paymentMethod: 'Bank Transfer',
        status: 'Received',
        unallocated_amount: 200.0,
      });

      // Create Invoice for AED 500
      const invoice = await InvoiceModel.create({
        companyId: new Types.ObjectId(companyId),
        invoice_number: 'INV-2026-010',
        customer_id: new Types.ObjectId(customerId),
        customer_name: 'Nithin paul volga',
        issue_date: '2026-08-05',
        due_date: '2026-08-15',
        grand_total: 500.0,
        subtotal: 500.0,
        paid_amount: 0,
        balance_amount: 500.0,
        status: 'Pending',
        lead_by: 'Sameer',
        items: [{ description: 'Visa Application', qty: 1, rate: 500 }],
      });

      const res = await getTestAgent()
        .post(`/api/v1/customers/${customerId}/allocate-credit`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId)
        .send({
          invoiceId: (invoice._id as Types.ObjectId).toString(),
          allocatedAmount: 500.0,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INSUFFICIENT_CREDIT');
    });

    it('should throw 400 INVOICE_ALREADY_PAID if invoice is already settled', async () => {
      // Create Receipt with AED 1000
      await ReceiptModel.create({
        companyId: new Types.ObjectId(companyId),
        customerId: new Types.ObjectId(customerId),
        customerName: 'Nithin paul volga',
        reference: 'REC-ADV-003',
        amount: 1000.0,
        date: '2026-08-01',
        paymentMethod: 'Bank Transfer',
        status: 'Received',
        unallocated_amount: 1000.0,
      });

      // Create Paid Invoice
      const invoice = await InvoiceModel.create({
        companyId: new Types.ObjectId(companyId),
        invoice_number: 'INV-2026-011',
        customer_id: new Types.ObjectId(customerId),
        customer_name: 'Nithin paul volga',
        issue_date: '2026-08-05',
        due_date: '2026-08-15',
        grand_total: 500.0,
        subtotal: 500.0,
        paid_amount: 500.0,
        balance_amount: 0.0,
        status: 'Paid',
        lead_by: 'Sameer',
        items: [{ description: 'Visa Application', qty: 1, rate: 500 }],
      });

      const res = await getTestAgent()
        .post(`/api/v1/customers/${customerId}/allocate-credit`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId)
        .send({
          invoiceId: (invoice._id as Types.ObjectId).toString(),
          allocatedAmount: 200.0,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVOICE_ALREADY_PAID');
    });
  });

  describe('Invoice Advance Deposit & Migrated FIFO Endpoints', () => {
    it('1. POST /api/v1/invoices should create invoice with advance_paid deposit and calculate remaining balance', async () => {
      const res = await getTestAgent()
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId)
        .send({
          customer_id: customerId,
          customer_name: 'Angad KT',
          service: 'Visa Services',
          issue_date: '2026-09-03',
          due_date: '2026-09-10',
          grand_total: 2339.0,
          subtotal: 2227.62,
          vat: 111.38,
          advance_paid: 300.0,
          lead_by: 'Ahmed',
          items: [{ description: 'Visa Services', qty: 1, rate: 2227.62, tax: 5 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.advance_paid).toBe(300.0);
      expect(res.body.data.paid).toBe(300.0);
      expect(res.body.data.remaining).toBe(2039.0);
      expect(res.body.data.status).toBe('Partially Paid');
    });

    it('2. GET /api/v1/invoices/outstanding should list overdue and due soon open invoices', async () => {
      // Overdue Invoice (due date in past)
      await InvoiceModel.create({
        companyId: new Types.ObjectId(companyId),
        invoice_number: 'INV-OVERDUE-01',
        customer_name: 'Customer Overdue',
        issue_date: '2026-08-01',
        due_date: '2026-08-10',
        grand_total: 1000.0,
        paid_amount: 200.0,
        balance_amount: 800.0,
        status: 'Partially Paid',
        lead_by: 'Sameer',
        items: [{ description: 'Overdue service', qty: 1, rate: 1000 }],
      });

      // Due soon Invoice (due date in future)
      await InvoiceModel.create({
        companyId: new Types.ObjectId(companyId),
        invoice_number: 'INV-DUESOON-01',
        customer_name: 'Customer Due Soon',
        issue_date: '2026-09-01',
        due_date: '2026-12-31',
        grand_total: 500.0,
        paid_amount: 0,
        balance_amount: 500.0,
        status: 'Pending',
        lead_by: 'Sameer',
        items: [{ description: 'Future service', qty: 1, rate: 500 }],
      });

      const res = await getTestAgent()
        .get('/api/v1/invoices/outstanding')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      const overdueItem = res.body.data.find((i: any) => i.invoiceId === 'INV-OVERDUE-01');
      expect(overdueItem).toBeDefined();
      expect(overdueItem.outstanding).toBe(800.0);
      expect(overdueItem.status).toBe('Overdue');
      expect(overdueItem.daysOverdue).toBeGreaterThan(0);

      const dueSoonItem = res.body.data.find((i: any) => i.invoiceId === 'INV-DUESOON-01');
      expect(dueSoonItem).toBeDefined();
      expect(dueSoonItem.outstanding).toBe(500.0);
      expect(dueSoonItem.status).toBe('Due Soon');
      expect(dueSoonItem.daysOverdue).toBe(0);
    });

    it('3. GET /api/v1/receipts should return applied and advance per receipt', async () => {
      await ReceiptModel.create({
        companyId: new Types.ObjectId(companyId),
        customerId: new Types.ObjectId(customerId),
        customerName: 'Nithin paul volga',
        reference: 'REC-TEST-007',
        amount: 2000.0,
        date: '2026-09-03',
        paymentMethod: 'Bank Transfer',
        status: 'Received',
        unallocated_amount: 500.0,
        allocations: [{ invoice_id: 'INV-001', allocated_amount: 1500.0, remaining_invoice_balance: 0 }],
      });

      const res = await getTestAgent()
        .get('/api/v1/receipts')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId);

      expect(res.status).toBe(200);
      const target = res.body.data.find((r: any) => r.reference_number === 'REC-TEST-007');
      expect(target).toBeDefined();
      expect(target.applied).toBe(1500.0);
      expect(target.advance).toBe(500.0);
    });

    it('4. GET /api/v1/dashboard/financial-summary should compute aggregated KPIs across all customers', async () => {
      const res = await getTestAgent()
        .get('/api/v1/dashboard/financial-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalRevenue');
      expect(res.body.data).toHaveProperty('totalReceived');
      expect(res.body.data).toHaveProperty('outstanding');
      expect(res.body.data).toHaveProperty('advanceTotal');
      expect(res.body.data).toHaveProperty('chartData');
      expect(res.body.data).toHaveProperty('employeeSales');
      expect(Array.isArray(res.body.data.chartData)).toBe(true);
      expect(res.body.data.chartData.length).toBe(7);
    });
  });
});
