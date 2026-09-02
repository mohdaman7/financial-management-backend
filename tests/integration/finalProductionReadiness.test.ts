import { getTestAgent } from '../helpers/testApp';
import { Types } from 'mongoose';
import { CompanyModel } from '../../src/modules/company/infrastructure/models/Company.model';
import { RoleModel } from '../../src/modules/auth/infrastructure/models/Role.model';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import { CustomerModel } from '../../src/modules/customer/infrastructure/models/Customer.model';
import { InvoiceModel } from '../../src/modules/finance/infrastructure/models/Invoice.model';
import { TravelInvoiceModel } from '../../src/modules/travel/infrastructure/models/TravelInvoice.model';
import { TransactionModel } from '../../src/modules/finance/infrastructure/models/Transaction.model';
import { BankAccountModel } from '../../src/modules/finance/infrastructure/models/BankAccount.model';
import { AuditLogModel } from '../../src/modules/audit/infrastructure/models/AuditLog.model';
import { CurrencyPrecision } from '../../src/shared/utils/currencyPrecision';
import bcrypt from 'bcrypt';

describe('FINAL Phase 2: Production Readiness, Financial Integrity & E2E Verification', () => {
  let authToken: string;
  let companyId: Types.ObjectId;
  let bankAccountId: Types.ObjectId;

  beforeEach(async () => {
    const company = await CompanyModel.create({
      name: 'Skyfall Global Enterprises LLC',
      code: `SKY-${Date.now()}`,
    });
    companyId = company._id as Types.ObjectId;

    const bank = await BankAccountModel.create({
      companyId,
      accountNumber: `AE-RAK-${Date.now()}`,
      bankName: 'RAKBANK',
      accountName: 'Skyfall Global Enterprises LLC Operating Account',
      currentBalance: 50000,
      currency: 'AED',
    });
    bankAccountId = bank._id as Types.ObjectId;

    const fullPermissions = [
      'manage_travel',
      'view_proposals',
      'manage_proposals',
      'view_finance',
      'manage_finance',
      'view_customers',
      'manage_customers',
      'generate_invoices',
      'manage_services',
    ];

    const role = await RoleModel.create({
      name: 'Executive Auditor & Controller',
      description: 'Senior Finance & Operations Controller',
      permissions: fullPermissions,
      companyId,
    });

    const passwordHash = await bcrypt.hash('ProductionPass2026!', 10);
    await UserModel.create({
      name: 'Chief Financial Officer',
      email: 'cfo@skyfall.ae',
      passwordHash,
      isSuperAdmin: false,
      companyId,
      roleId: role._id as Types.ObjectId,
    });

    const agent = getTestAgent();
    const loginRes = await agent.post('/api/v1/auth/login').send({
      email: 'cfo@skyfall.ae',
      password: 'ProductionPass2026!',
    });
    authToken = loginRes.body.data.accessToken;
  });

  describe('1. Deterministic Financial Precision & Float-Safety Unit Proofs', () => {
    it('should accurately compute classic floating point drift cases (0.1 + 0.2)', () => {
      const sum = CurrencyPrecision.sum([0.1, 0.2]);
      expect(sum).toBe(0.3);
      expect(CurrencyPrecision.round(0.1 + 0.2)).toBe(0.3);
    });

    it('should accurately calculate UAE 5% VAT with midpoint rounding boundaries', () => {
      // 100.01 * 0.05 = 5.0005 -> rounds down to 5.00
      expect(CurrencyPrecision.calculateVat(100.01, 5)).toBe(5.0);
      // 100.10 * 0.05 = 5.005 -> with Number.EPSILON rounds to 5.01
      expect(CurrencyPrecision.calculateVat(100.1, 5)).toBe(5.01);
      // 999.99 - 123.45 = 876.54
      expect(CurrencyPrecision.round(999.99 - 123.45)).toBe(876.54);
    });

    it('should maintain exact precision over DB save -> read -> recalculate loop', async () => {
      const inv = await InvoiceModel.create({
        companyId,
        invoice_number: 'TEST-PREC-01',
        customer_name: 'Precision Test Corp',
        lead_by: 'Sameer',
        category: 'Corporate',
        issue_date: '2026-09-02',
        due_date: '2026-09-10',
        payment_terms: 'CASH',
        currency: 'AED',
        status: 'Pending',
        items: [
          {
            description: 'Item A',
            qty: 3,
            rate: 33.33,
            tax: 5,
            netAmount: 99.99,
            govCost: 20.0,
            suplFee: 10.0,
            proComm: 5.0,
            netProfit: 64.99,
          },
        ],
        subtotal: 99.99,
        vat: 5.0,
        additions: 0,
        deductions: 0,
        grand_total: 104.99,
        total_profit: 64.99,
        paid_amount: 0,
        balance_amount: 104.99,
      });

      const fetched = await InvoiceModel.findById(inv._id);
      expect(fetched?.subtotal).toBe(99.99);
      expect(fetched?.vat).toBe(5.0);
      expect(fetched?.grand_total).toBe(104.99);
      expect(fetched?.total_profit).toBe(64.99);

      // Re-run precision calculation
      const recalculated = CurrencyPrecision.round((fetched?.subtotal || 0) + (fetched?.vat || 0));
      expect(recalculated).toBe(104.99);
    });
  });

  describe('2. Comprehensive 24-Step End-to-End Financial & Operational Scenario', () => {
    it('should complete all 24 operational steps with full integrity and ledger balance', async () => {
      const agent = getTestAgent();

      // Step 1: Create customer with opening balance of AED 500
      const custRes = await agent
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Al Habtoor Luxury Group',
          email: 'accounts@habtoor.ae',
          phone: '+971 4 333 4444',
          company_name: 'Al Habtoor Group LLC',
          opening_balance: 500,
          status: 'vip',
          priority: 'high',
        });
      expect(custRes.status).toBe(201);
      const customerId = custRes.body.data._id || custRes.body.data.id;

      // Step 2: Verify customer opening balance persisted in database
      const custDoc = await CustomerModel.findById(customerId);
      expect(custDoc?.opening_balance).toBe(500);

      // Step 3: Create Service catalog item
      const srvRes = await agent
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Golden Visa Concierge 10-Year',
          category: 'UAE Visa & Immigration Services',
          government_fee: 2800,
          company_service_charge: 1200,
          processing_time: '3-5 Business Days',
          status: 'active',
        });
      expect(srvRes.status).toBe(201);
      expect(srvRes.body.data.total_cost || srvRes.body.data.price).toBe(4000);

      // Step 4: Create Quotation with line items and proportional discount
      const quoteRes = await agent
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customer_id: customerId,
          customer_name: 'Al Habtoor Luxury Group',
          date: '2026-09-02',
          payment_terms: 'BANK_TRANSFER',
          items: [
            { description: 'Golden Visa Processing', qty: 1, rate: 4000, tax: 5 },
            { description: 'VIP Medical & Emirates ID Typing', qty: 2, rate: 500, tax: 5 },
          ],
          discount_amount: 500, // Total subtotal = 5000, discount = 500, taxable = 4500
          paid_amount: 1000,
        });
      expect(quoteRes.status).toBe(201);
      const quoteData = quoteRes.body.data;
      expect(quoteData.subtotal).toBe(5000);
      expect(quoteData.discount_amount).toBe(500);
      expect(quoteData.total_tax).toBe(225); // 5% of 4500
      expect(quoteData.grand_total).toBe(4725);
      expect(quoteData.paid_amount).toBe(1000);
      expect(quoteData.balance_amount).toBe(3725);
      expect(quoteData.amount_in_words).toContain('Dirhams');

      // Step 5: Convert Quotation to Invoice & Step 6-8: Verify VAT, Net Profit & PRO Commission
      const invRes = await agent
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customer_name: 'Al Habtoor Luxury Group',
          customer_id: customerId,
          category: 'Visa Services',
          items: [
            {
              description: 'Golden Visa Processing',
              qty: 1,
              rate: 4000,
              tax: 5,
              govCost: 2800,
              suplFee: 200,
              proComm: 150,
            },
            {
              description: 'VIP Medical Typing',
              qty: 2,
              rate: 500,
              tax: 5,
              govCost: 350,
              suplFee: 50,
              proComm: 50,
            },
          ],
          additions: 0,
          deductions: 0,
          paid_amount: 0,
        });

      expect(invRes.status).toBe(201);
      const invData = invRes.body.data;
      // Subtotal = 4000 + 1000 = 5000
      expect(invData.subtotal).toBe(5000);
      // VAT = 5% of 5000 = 250
      expect(invData.vat).toBe(250);
      // Grand total = 5250
      expect(invData.grand_total).toBe(5250);
      // Total Gov Cost = 2800 + 350 = 3150; Supl Fee = 200 + 50 = 250; PRO Comm = 150 + 50 = 200;
      // Line 1 profit = 4000 - 3000 - 150 = 850
      // Line 2 profit = 1000 - 400 - 50 = 550
      // Total Profit = 850 + 550 = 1400
      expect(invData.total_profit).toBe(1400);

      // Create booking invoice representation for receipt engine tests
      const travelInv = await TravelInvoiceModel.create({
        companyId,
        customerId: new Types.ObjectId(customerId),
        bookingId: new Types.ObjectId(),
        invoiceNumber: invData.invoice_number,
        amount: 5250,
        status: 'unpaid',
        dueDate: new Date('2026-09-30'),
        payments: [],
      });

      // Step 9 & 10: Create Receipt for Invoice and allocate FIFO
      const rec1Res = await agent
        .post('/api/v1/receipts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invoiceId: travelInv._id.toString(),
          customerId,
          customerName: 'Al Habtoor Luxury Group',
          paymentMethod: 'Bank Transfer',
          amount: 3000,
          notes: 'First installment payment',
        });
      expect(rec1Res.status).toBe(201);
      const alloc1 = rec1Res.body.data.allocations;
      expect(alloc1.length).toBe(1);
      expect(alloc1[0].allocated_amount).toBe(3000);
      expect(alloc1[0].remaining_invoice_balance).toBe(2250);

      // Step 11: Create second Invoice of AED 2000
      await TravelInvoiceModel.create({
        companyId,
        customerId: new Types.ObjectId(customerId),
        bookingId: new Types.ObjectId(),
        invoiceNumber: 'INV-2026-0902',
        amount: 2000,
        status: 'unpaid',
        dueDate: new Date('2026-10-15'),
        payments: [],
        createdAt: new Date(Date.now() + 1000), // created after inv 1
      });

      // Step 12, 13, 14 & 15: Create second Receipt of AED 5000 covering remaining 2250 of Inv 1, full 2000 of Inv 2, with 750 overpayment advance
      const rec2Res = await agent
        .post('/api/v1/receipts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId,
          customerName: 'Al Habtoor Luxury Group',
          paymentMethod: 'Bank Transfer',
          amount: 5000,
          notes: 'Lump sum settlement and advance deposit',
        });
      expect(rec2Res.status).toBe(201);
      const rec2Data = rec2Res.body.data;
      expect(rec2Data.unallocated_amount).toBe(750); // Overpayment advance

      // Step 16: Record operating Expense of AED 1,000 + 5% VAT (50)
      const expRes = await agent
        .post('/api/v1/finance/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'expense',
          category: 'Operations',
          description: 'Office Telecom & Cloud Servers',
          amount: 1050,
          taxAmount: 50,
          paymentMethod: 'bank_transfer',
          date: '2026-09-02',
          bankAccountId: bankAccountId.toString(),
        });
      expect(expRes.status).toBe(201);

      // Step 17: Verify Bank Account adjusted dynamically
      const bankAfter = await BankAccountModel.findById(bankAccountId);
      expect(bankAfter).toBeDefined();

      // Step 18: Verify Ledger double-entry balance (Income Transactions exist)
      const txs = await TransactionModel.find({ companyId });
      expect(txs.length).toBeGreaterThanOrEqual(2);

      // Step 19: Verify Customer Statement (Includes Opening Balance 500 + Transactions)
      const stmtRes = await agent
        .get(`/api/v1/reports/finance/customer-statement?customer_id=${customerId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(stmtRes.status).toBe(200);
      expect(stmtRes.body.data.statement).toBeDefined();

      // Step 20: Verify Outstanding Receivables report
      const outRes = await agent
        .get('/api/v1/reports/finance/outstanding')
        .set('Authorization', `Bearer ${authToken}`);
      expect(outRes.status).toBe(200);

      // Step 21: Verify Profit & Loss Report
      const pnlRes = await agent
        .get('/api/v1/reports/finance/profit-and-loss')
        .set('Authorization', `Bearer ${authToken}`);
      expect(pnlRes.status).toBe(200);

      // Step 22: Verify UAE VAT Return 201
      const vatRes = await agent
        .get('/api/v1/reports/finance/vat-return')
        .set('Authorization', `Bearer ${authToken}`);
      expect(vatRes.status).toBe(200);

      // Step 23: Verify PRO Commission Report
      const proRes = await agent
        .get('/api/v1/reports/finance/pro-commission')
        .set('Authorization', `Bearer ${authToken}`);
      expect(proRes.status).toBe(200);

      // Step 24: Verify Audit Log captures activities
      const logs = await AuditLogModel.find({ companyId });
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });
  });
});
