import { getTestAgent } from '../helpers/testApp';
import { Types } from 'mongoose';
import { CompanyModel } from '../../src/modules/company/infrastructure/models/Company.model';
import { RoleModel } from '../../src/modules/auth/infrastructure/models/Role.model';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import { TravelInvoiceModel } from '../../src/modules/travel/infrastructure/models/TravelInvoice.model';
import { TransactionModel } from '../../src/modules/finance/infrastructure/models/Transaction.model';
import bcrypt from 'bcrypt';

describe('Phase 2: Complete Realistic End-to-End Financial Lifecycle Scenario', () => {
  let authToken: string;
  let companyId: Types.ObjectId;

  beforeEach(async () => {
    const company = await CompanyModel.create({
      name: 'Skyfall Luxury Tours LLC',
      code: 'SKY-TOURS',
    });
    companyId = company._id as Types.ObjectId;

    const fullPermissions = [
      'manage_travel',
      'view_proposals',
      'manage_proposals',
      'view_finance',
      'manage_finance',
      'view_customers',
      'manage_customers',
      'generate_invoices',
    ];

    const role = await RoleModel.create({
      name: 'Financial Controller',
      description: 'Head of Accounts & Travel Operations',
      permissions: fullPermissions,
      companyId,
    });

    const passwordHash = await bcrypt.hash('password123', 10);
    await UserModel.create({
      email: 'controller@skyfall.ae',
      passwordHash,
      isSuperAdmin: false,
      companyId,
      roleId: role._id as Types.ObjectId,
    });

    const agent = getTestAgent();
    const loginRes = await agent.post('/api/v1/auth/login').send({
      email: 'controller@skyfall.ae',
      password: 'password123',
    });
    authToken = loginRes.body.data.accessToken;
  });

  it('should execute full financial lifecycle accurately without discrepancy', async () => {
    const agent = getTestAgent();

    // 1. Create Customer Lead / Client
    const customerRes = await agent
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Sheikh Hamdan Corporate Travel',
        email: 'travel@corporate.ae',
        phone: '+971 50 999 8888',
        company_name: 'Al Maktoum Holdings',
        status: 'active',
        priority: 'high',
      });

    expect(customerRes.status).toBe(201);
    const customerId = customerRes.body.data._id || customerRes.body.data.id;
    expect(customerId).toBeDefined();

    // 2. Generate Quotation Proposal (AED 10,000 subtotal, 5% UAE VAT = 500, Grand Total = 10,500, Advance = 2,000)
    const quoteRes = await agent
      .post('/api/v1/quotations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer_id: customerId,
        customer_name: 'Sheikh Hamdan Corporate Travel',
        date: '2026-09-02',
        payment_terms: 'BANK_TRANSFER',
        items: [
          { description: 'Executive VIP Visa Processing', qty: 2, rate: 2500, tax: 5 },
          { description: 'Luxury Chauffeur & Yacht Charter', qty: 1, rate: 5000, tax: 5 },
        ],
        discount_amount: 0,
        paid_amount: 2000,
      });

    expect(quoteRes.status).toBe(201);
    const quoteData = quoteRes.body.data;
    expect(quoteData.subtotal).toBe(10000);
    expect(quoteData.total_tax).toBe(500);
    expect(quoteData.grand_total).toBe(10500);
    expect(quoteData.paid_amount).toBe(2000);
    expect(quoteData.balance_amount).toBe(8500);
    const proposalId = quoteData.id;

    // 3. Mark Quotation as Accepted and Convert to Tax Invoice
    const updateQuoteRes = await agent
      .put(`/api/v1/quotations/${proposalId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'accepted' });
    expect(updateQuoteRes.status).toBe(200);

    // Create corresponding Tax Invoice in database
    const bookingId = new Types.ObjectId();
    const invoice: any = await TravelInvoiceModel.create({
      companyId,
      bookingId,
      invoiceNumber: 'INV-2026-0099',
      amount: 10500,
      status: 'unpaid',
      dueDate: new Date('2026-09-30'),
      payments: [
        {
          amount: 2000,
          date: new Date(),
          paymentMethod: 'bank_transfer',
        },
      ],
      createdAt: new Date(),
    });

    // 4. Issue a subsequent payment receipt of AED 3,000
    const receiptRes = await agent
      .post('/api/v1/receipts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        invoiceId: invoice._id.toString(),
        customerId: customerId,
        customerName: 'Sheikh Hamdan Corporate Travel',
        paymentMethod: 'Bank Transfer',
        amount: 3000,
        notes: 'Milestone 2 installment payment',
      });

    expect(receiptRes.status).toBe(201);
    const receiptAllocations = receiptRes.body.data.allocations;
    expect(receiptAllocations.length).toBe(1);
    expect(receiptAllocations[0].allocated_amount).toBe(3000);
    // Initial amount 10500 - 2000 (advance) = 8500 due. After 3000 receipt, remaining = 5500
    expect(receiptAllocations[0].remaining_invoice_balance).toBe(5500);

    // 5. Verify persisted invoice payments
    const updatedInv = await TravelInvoiceModel.findById(invoice._id);
    expect(updatedInv?.payments.length).toBe(2);
    const totalPayments = updatedInv?.payments.reduce((acc, p) => acc + p.amount, 0);
    expect(totalPayments).toBe(5000);
    expect(updatedInv?.status).toBe('unpaid');

    // 6. Verify Financial Ledger Income Transactions
    const incomeTx = await TransactionModel.findOne({
      companyId,
      amount: 3000,
      type: 'income',
    });
    expect(incomeTx).toBeDefined();

    // 7. Test Outstanding Invoices Report
    const outReportRes = await agent
      .get('/api/v1/reports/finance/outstanding')
      .set('Authorization', `Bearer ${authToken}`);
    expect(outReportRes.status).toBe(200);

    // 8. Test Customer Statement Report
    const stmtRes = await agent
      .get(`/api/v1/reports/finance/customer-statement?customer_id=${customerId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(stmtRes.status).toBe(200);
  });
});
