import { getTestAgent } from '../helpers/testApp';
import { Types } from 'mongoose';
import { CompanyModel } from '../../src/modules/company/infrastructure/models/Company.model';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import { RoleModel } from '../../src/modules/auth/infrastructure/models/Role.model';
import { TransactionModel } from '../../src/modules/finance/infrastructure/models/Transaction.model';
import { ReceiptModel } from '../../src/modules/finance/infrastructure/models/Receipt.model';
import { InvoiceModel } from '../../src/modules/finance/infrastructure/models/Invoice.model';
import { BankAccountModel } from '../../src/modules/finance/infrastructure/models/BankAccount.model';
import bcrypt from 'bcrypt';

describe('Bank Account Statement & Financial Reports Endpoint', () => {
  let authToken: string;
  let companyId: Types.ObjectId;
  let otherCompanyId: Types.ObjectId;

  beforeEach(async () => {
    // 1. Create primary company
    const company = await CompanyModel.create({
      name: 'Skyfall Luxury Tours LLC',
      code: `SKY-${Date.now()}`,
    });
    companyId = company._id as Types.ObjectId;

    // 2. Create secondary company for tenant isolation tests
    const otherCompany = await CompanyModel.create({
      name: 'Other Tenant Travel LLC',
      code: `OTHER-${Date.now()}`,
    });
    otherCompanyId = otherCompany._id as Types.ObjectId;

    // 3. Create Bank Account for company
    await BankAccountModel.create({
      companyId,
      bankName: 'Emirates NBD',
      accountName: 'Main Corporate Account',
      accountNumber: 'AE000123456789012345678',
      currentBalance: 50000,
      currency: 'AED',
      status: 'active',
    });

    // 4. Create User & Authenticate
    const role = await RoleModel.create({
      name: 'Financial Controller',
      description: 'Head of Finance and Accounts',
      permissions: ['view_finance', 'manage_finance', 'generate_invoices'],
      companyId,
    });

    const passwordHash = await bcrypt.hash('password123', 10);
    await UserModel.create({
      name: 'Finance Admin',
      email: 'finance@skyfall.ae',
      passwordHash,
      role: 'admin',
      isSuperAdmin: false,
      companyId,
      roleId: role._id,
    });

    const loginRes = await getTestAgent().post('/api/v1/auth/login').send({
      email: 'finance@skyfall.ae',
      password: 'password123',
    });
    authToken = loginRes.body.data.accessToken;

    // 5. Seed Prior Transactions (August 2026 for opening balance calculation)
    // Deposit of 15,000 on 2026-08-15
    await TransactionModel.create({
      companyId,
      type: 'income',
      category: 'Capital Inflow',
      amount: 15000,
      taxAmount: 0,
      date: new Date('2026-08-15T10:00:00.000Z'),
      paymentMethod: 'bank_transfer',
      status: 'completed',
      reference: 'TXN-AUG-001',
      description: 'Capital Injection - Founder',
    });

    // Withdrawal of 5,000 on 2026-08-20 -> Net opening before Sept = 10,000.00
    await TransactionModel.create({
      companyId,
      type: 'expense',
      category: 'Office Equipment',
      amount: 5000,
      taxAmount: 0,
      date: new Date('2026-08-20T10:00:00.000Z'),
      paymentMethod: 'card',
      status: 'completed',
      reference: 'TXN-AUG-002',
      description: 'IT Equipment Purchase - Apple Store',
    });

    // 6. Seed Current Period Transactions (September 2026)
    // Transaction 1: Bank Deposit of 599 on 2026-09-02 (Receipt Voucher)
    await ReceiptModel.create({
      companyId,
      reference: 'REC-SKY-2026-ST7004',
      customerName: 'Angad KT',
      paymentMethod: 'Bank Transfer',
      amount: 599,
      currency: 'AED',
      date: '2026-09-02',
      status: 'Received',
      notes: 'Bank Deposit - Angad KT',
    });

    // Transaction 2: Bank Withdrawal of 1,200 on 2026-09-02 (Direct Debit Supplier)
    await TransactionModel.create({
      companyId,
      type: 'expense',
      category: 'Airline Supplier Payment',
      amount: 1200,
      taxAmount: 0,
      date: new Date('2026-09-02T14:30:00.000Z'),
      paymentMethod: 'other',
      status: 'completed',
      reference: 'WDR-SUPP-8802',
      description: 'Airline Supplier Payment - Emirates Group',
    });

    // Transaction 3: Standard Invoice Bank Payment of 5,000 on 2026-09-05
    await InvoiceModel.create({
      companyId,
      invoice_number: 'INV-2026-0901',
      customer_name: 'Sheikh Hamdan Corporate',
      issue_date: '2026-09-05',
      due_date: '2026-09-15',
      payment_terms: 'BANK_TRANSFER',
      currency: 'AED',
      subtotal: 4761.9,
      vat: 238.1,
      grand_total: 5000,
      paid_amount: 5000,
      balance_amount: 0,
      status: 'Paid',
      lead_by: 'Sameer',
    });

    // 7. Seed Cash Transactions (MUST be excluded from Bank Statement)
    await TransactionModel.create({
      companyId,
      type: 'income',
      category: 'Cash Sales',
      amount: 850,
      taxAmount: 0,
      date: new Date('2026-09-03T11:00:00.000Z'),
      paymentMethod: 'cash',
      status: 'completed',
      reference: 'CSH-DRAWER-001',
      description: 'Walk-in Visa Fee (Cash)',
    });

    await ReceiptModel.create({
      companyId,
      reference: 'REC-CASH-999',
      customerName: 'Cash Client',
      paymentMethod: 'Cash',
      amount: 400,
      currency: 'AED',
      date: '2026-09-03',
      status: 'Received',
      notes: 'Cash Payment Walk-in',
    });

    // 8. Seed a Transaction in Other Company for Multi-Tenant Isolation
    await TransactionModel.create({
      companyId: otherCompanyId,
      type: 'income',
      category: 'Foreign Inflow',
      amount: 99999,
      date: new Date('2026-09-02T10:00:00.000Z'),
      paymentMethod: 'bank_transfer',
      status: 'completed',
      reference: 'OTHER-TXN-001',
      description: 'Secret Foreign Deposit',
    });
  });

  describe('GET /api/v1/finance/bank-statement', () => {
    it('1. should return 200 OK with correct summary, pagination, and transactions', async () => {
      const res = await getTestAgent()
        .get('/api/v1/finance/bank-statement?startDate=2026-09-01&endDate=2026-09-30')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId.toString());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Bank account statement fetched successfully');

      const data = res.body.data;
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('pagination');
      expect(data).toHaveProperty('transactions');

      // Summary checks
      // Opening balance: 15,000 (deposit) - 5,000 (withdrawal) prior to 2026-09-01 = 10,000.00
      expect(data.summary.openingBalance).toBe(10000);
      // Deposits in Sept: 599 (Angad KT) + 5,000 (INV-2026-0901) = 5,599.00
      expect(data.summary.totalDeposits).toBe(5599);
      // Withdrawals in Sept: 1,200 (Emirates Group) = 1,200.00
      expect(data.summary.totalWithdrawals).toBe(1200);
      // Closing: 10,000 + 5,599 - 1,200 = 14,399.00
      expect(data.summary.closingBalance).toBe(14399);
      expect(data.summary.currency).toBe('AED');

      // Pagination checks
      expect(data.pagination.totalRecords).toBe(3);
      expect(data.pagination.currentPage).toBe(1);
      expect(data.pagination.totalPages).toBe(1);
      expect(data.pagination.limit).toBe(50);

      // Transactions array checks
      expect(data.transactions.length).toBe(3);

      // Sorted by date descending: 2026-09-05 first, then 2026-09-02
      expect(data.transactions[0].date).toBe('2026-09-05');
      expect(data.transactions[0].reference).toBe('INV-2026-0901');
      expect(data.transactions[0].deposit).toBe(5000);
      expect(data.transactions[0].withdrawal).toBe(0);
      expect(data.transactions[0].runningBalance).toBe(14399);

      // Check the 2026-09-02 transactions
      const sept2Txs = data.transactions.filter((t: any) => t.date === '2026-09-02');
      expect(sept2Txs.length).toBe(2);

      const angadTx = sept2Txs.find((t: any) => t.reference === 'REC-SKY-2026-ST7004');
      expect(angadTx).toBeDefined();
      expect(angadTx.deposit).toBe(599);
      expect(angadTx.withdrawal).toBe(0);
      expect(angadTx.runningBalance).toBe(10599);
      expect(angadTx.status).toBe('Cleared');

      const emiratesTx = sept2Txs.find((t: any) => t.reference === 'WDR-SUPP-8802');
      expect(emiratesTx).toBeDefined();
      expect(emiratesTx.deposit).toBe(0);
      expect(emiratesTx.withdrawal).toBe(1200);
      expect(emiratesTx.runningBalance).toBe(9399);
      expect(emiratesTx.status).toBe('Cleared');
    });

    it('2. should support alternative endpoint GET /api/v1/bank-transactions', async () => {
      const res = await getTestAgent()
        .get('/api/v1/bank-transactions?startDate=2026-09-01&endDate=2026-09-30')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId.toString());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.openingBalance).toBe(10000);
      expect(res.body.data.summary.closingBalance).toBe(14399);
      expect(res.body.data.transactions.length).toBe(3);
    });

    it('3. should default openingBalance to 0.00 when startDate is omitted', async () => {
      const res = await getTestAgent()
        .get('/api/v1/finance/bank-statement')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.summary.openingBalance).toBe(0);
      // All 5 non-cash transactions (2 from August, 3 from September)
      expect(res.body.data.pagination.totalRecords).toBe(5);
    });

    it('4. should strictly exclude cash payments', async () => {
      const res = await getTestAgent()
        .get('/api/v1/finance/bank-statement')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId.toString());

      expect(res.status).toBe(200);
      const refs = res.body.data.transactions.map((t: any) => t.reference);
      expect(refs).not.toContain('CSH-DRAWER-001');
      expect(refs).not.toContain('REC-CASH-999');
    });

    it('5. should filter transactions by search query matching reference or customerName', async () => {
      const res = await getTestAgent()
        .get('/api/v1/finance/bank-statement?search=Angad')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.transactions.length).toBe(1);
      expect(res.body.data.transactions[0].customerName).toBe('Angad KT');
      expect(res.body.data.summary.totalDeposits).toBe(599);
    });

    it('6. should enforce multi-tenant isolation via x-company-id', async () => {
      const res = await getTestAgent()
        .get('/api/v1/finance/bank-statement')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId.toString());

      expect(res.status).toBe(200);
      const refs = res.body.data.transactions.map((t: any) => t.reference);
      expect(refs).not.toContain('OTHER-TXN-001');
    });

    it('7. should paginate records correctly with page and limit parameters', async () => {
      const res = await getTestAgent()
        .get('/api/v1/finance/bank-statement?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.limit).toBe(2);
      expect(res.body.data.pagination.currentPage).toBe(1);
      expect(res.body.data.pagination.totalPages).toBe(3);
      expect(res.body.data.transactions.length).toBe(2);
    });

    it('8. should return 401 Unauthorized when token is missing', async () => {
      const res = await getTestAgent().get('/api/v1/finance/bank-statement');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('9. should return 400 Bad Request when startDate format is invalid', async () => {
      const res = await getTestAgent()
        .get('/api/v1/finance/bank-statement?startDate=01-09-2026')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId.toString());

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid date format for startDate. Expected YYYY-MM-DD.');
    });

    it('10. should return 400 Bad Request when endDate format is invalid', async () => {
      const res = await getTestAgent()
        .get('/api/v1/finance/bank-statement?endDate=2026/09/30')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-company-id', companyId.toString());

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid date format for endDate. Expected YYYY-MM-DD.');
    });
  });
});
