import { CurrencyPrecision } from '../../src/shared/utils/currencyPrecision';
import { getTestAgent } from '../helpers/testApp';
import { Types } from 'mongoose';
import { CompanyModel } from '../../src/modules/company/infrastructure/models/Company.model';
import { RoleModel } from '../../src/modules/auth/infrastructure/models/Role.model';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import { TravelInvoiceModel } from '../../src/modules/travel/infrastructure/models/TravelInvoice.model';
import bcrypt from 'bcrypt';

describe('Financial Hardening, VAT Precision & FIFO Stress Tests', () => {
  let authToken: string;
  let companyId: Types.ObjectId;

  beforeEach(async () => {
    const company = await CompanyModel.create({ name: 'Skyfall Finance Ltd', code: 'SKY' });
    companyId = company._id as Types.ObjectId;

    const role = await RoleModel.create({
      name: 'Accountant Admin',
      description: 'Accountant Admin Role',
      permissions: ['view_finance', 'manage_finance', 'view_proposals', 'manage_proposals'],
      companyId: company._id as Types.ObjectId,
    });

    const passwordHash = await bcrypt.hash('password123', 10);
    await UserModel.create({
      email: 'accountant@skyfall.ae',
      passwordHash,
      isSuperAdmin: false,
      companyId: company._id as Types.ObjectId,
      roleId: role._id as Types.ObjectId,
    });

    const agent = getTestAgent();
    const loginRes = await agent.post('/api/v1/auth/login').send({
      email: 'accountant@skyfall.ae',
      password: 'password123',
    });
    authToken = loginRes.body.data.accessToken;
  });

  describe('1. Currency Precision & IEEE-754 Mitigation Unit Logic', () => {
    it('should correctly round all specified precision edge cases without floating point drift', () => {
      // Test suite explicit requirements: 0.01, 0.03, 0.05, 0.10, 99.99, 999.99, 1234.56, 10000.01
      expect(CurrencyPrecision.round(0.01)).toBe(0.01);
      expect(CurrencyPrecision.round(0.03)).toBe(0.03);
      expect(CurrencyPrecision.round(0.05)).toBe(0.05);
      expect(CurrencyPrecision.round(0.1)).toBe(0.1);
      expect(CurrencyPrecision.round(99.99)).toBe(99.99);
      expect(CurrencyPrecision.round(999.99)).toBe(999.99);
      expect(CurrencyPrecision.round(1234.56)).toBe(1234.56);
      expect(CurrencyPrecision.round(10000.01)).toBe(10000.01);

      // Boundary half-up roundings
      expect(CurrencyPrecision.round(1.005)).toBe(1.01);
      expect(CurrencyPrecision.round(10.005)).toBe(10.01);
    });

    it('should accurately calculate standard UAE 5% VAT across edge cases', () => {
      expect(CurrencyPrecision.calculateVat(0.01)).toBe(0.0);
      expect(CurrencyPrecision.calculateVat(0.03)).toBe(0.0);
      expect(CurrencyPrecision.calculateVat(0.05)).toBe(0.0);
      expect(CurrencyPrecision.calculateVat(0.1)).toBe(0.01);
      expect(CurrencyPrecision.calculateVat(20)).toBe(1.0);
      expect(CurrencyPrecision.calculateVat(99.99)).toBe(5.0);
      expect(CurrencyPrecision.calculateVat(100)).toBe(5.0);
      expect(CurrencyPrecision.calculateVat(999.99)).toBe(50.0);
      expect(CurrencyPrecision.calculateVat(1234.56)).toBe(61.73);
      expect(CurrencyPrecision.calculateVat(10000.01)).toBe(500.0);
      expect(CurrencyPrecision.calculateVat(14285.71)).toBe(714.29);
    });

    it('should accurately convert to/from minor units (AED Fils)', () => {
      expect(CurrencyPrecision.toMinorUnits(150.75)).toBe(15075);
      expect(CurrencyPrecision.toMinorUnits(1234.56)).toBe(123456);
      expect(CurrencyPrecision.fromMinorUnits(15075)).toBe(150.75);
      expect(CurrencyPrecision.fromMinorUnits(123456)).toBe(1234.56);
      expect(CurrencyPrecision.sum([10.25, 20.35, 5.4, 0.01, 1234.56])).toBe(1270.57);
    });
  });

  describe('2. Multi-Invoice FIFO & Overpayment Allocations', () => {
    it('should allocate a single lump-sum receipt across multiple unpaid invoices in FIFO order', async () => {
      const agent = getTestAgent();
      const bookingId = new Types.ObjectId();

      // Create 3 invoices for the customer: Inv1 = 500, Inv2 = 1000, Inv3 = 800
      const inv1: any = await TravelInvoiceModel.create({
        companyId,
        bookingId,
        invoiceNumber: 'INV-FIFO-001',
        amount: 500,
        status: 'unpaid',
        dueDate: new Date('2026-02-01'),
        payments: [],
        createdAt: new Date('2026-01-01'),
      });

      const inv2: any = await TravelInvoiceModel.create({
        companyId,
        bookingId,
        invoiceNumber: 'INV-FIFO-002',
        amount: 1000,
        status: 'unpaid',
        dueDate: new Date('2026-02-01'),
        payments: [],
        createdAt: new Date('2026-01-02'),
      });

      const inv3: any = await TravelInvoiceModel.create({
        companyId,
        bookingId,
        invoiceNumber: 'INV-FIFO-003',
        amount: 800,
        status: 'unpaid',
        dueDate: new Date('2026-02-01'),
        payments: [],
        createdAt: new Date('2026-01-03'),
      });

      // Customer makes a payment receipt of 1200 AED
      // FIFO Expectation: Inv1 (500) fully paid, Inv2 (1000) partially paid by 700 (300 due), Inv3 untouched (800 due)
      const receiptRes = await agent
        .post('/api/v1/receipts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerName: 'FIFO VIP Customer',
          paymentMethod: 'Bank Transfer',
          amount: 1200,
          notes: 'Lump sum settlement',
        });

      expect(receiptRes.status).toBe(201);
      expect(receiptRes.body.success).toBe(true);

      const allocations = receiptRes.body.data.allocations;
      expect(allocations.length).toBe(2);

      // Check Inv1 was fully allocated 500
      expect(allocations[0].invoice_id).toBe('INV-FIFO-001');
      expect(allocations[0].allocated_amount).toBe(500);
      expect(allocations[0].remaining_invoice_balance).toBe(0);

      // Check Inv2 was allocated remaining 700
      expect(allocations[1].invoice_id).toBe('INV-FIFO-002');
      expect(allocations[1].allocated_amount).toBe(700);
      expect(allocations[1].remaining_invoice_balance).toBe(300);

      // Verify DB persistence of Inv1 status
      const updatedInv1 = await TravelInvoiceModel.findById(inv1._id);
      expect(updatedInv1?.status).toBe('paid');

      // Verify DB persistence of Inv2 status
      const updatedInv2 = await TravelInvoiceModel.findById(inv2._id);
      expect(updatedInv2?.status).toBe('unpaid');
      const totalPaidInv2 = (updatedInv2?.payments || []).reduce((acc, p) => acc + p.amount, 0);
      expect(totalPaidInv2).toBe(700);

      // Verify DB persistence of Inv3 status
      const updatedInv3 = await TravelInvoiceModel.findById(inv3._id);
      expect(updatedInv3?.status).toBe('unpaid');
      expect((updatedInv3?.payments || []).length).toBe(0);
    });

    it('should handle single invoice overpayment cleanly without exceeding invoice total', async () => {
      const agent = getTestAgent();
      const bookingId = new Types.ObjectId();

      const inv: any = await TravelInvoiceModel.create({
        companyId,
        bookingId,
        invoiceNumber: 'INV-OVERPAY-001',
        amount: 1000,
        status: 'unpaid',
        dueDate: new Date('2026-02-01'),
        payments: [],
        createdAt: new Date('2026-01-01'),
      });

      // Customer pays 1500 AED on a 1000 AED invoice
      const receiptRes = await agent
        .post('/api/v1/receipts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invoiceId: inv._id.toString(),
          customerName: 'Overpay VIP Customer',
          paymentMethod: 'Bank Transfer',
          amount: 1500,
          notes: 'Excess advance settlement',
        });

      expect(receiptRes.status).toBe(201);
      const allocations = receiptRes.body.data.allocations;
      expect(allocations.length).toBe(1);
      expect(allocations[0].allocated_amount).toBe(1000);
      expect(allocations[0].remaining_invoice_balance).toBe(0);

      const updatedInv = await TravelInvoiceModel.findById(inv._id);
      expect(updatedInv?.status).toBe('paid');
      const totalPaid = (updatedInv?.payments || []).reduce((acc, p) => acc + p.amount, 0);
      expect(totalPaid).toBe(1000);
    });
  });

  describe('3. Multiple Line Items, Discount & 5% VAT Combination Calculations', () => {
    it('should correctly compute proportional discount and 5% UAE VAT in quotation creation with multiple line items', async () => {
      const agent = getTestAgent();

      // 3 items:
      // Item 1: 1000 AED (qty 1)
      // Item 2: 2000 AED (qty 1)
      // Item 3: 500 AED (qty 2) = 1000 AED
      // Total Subtotal = 4000 AED
      // Discount = 800 AED (20% discount) => Taxable Amount = 3200 AED
      // 5% VAT on 3200 AED = 160 AED => Grand Total = 3360 AED
      // Partial Paid Advance = 1360 AED => Balance Due = 2000 AED
      const quoteRes = await agent
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customer_name: 'Precision Multi-Item Corp',
          items: [
            { description: 'Dubai Business Visa', qty: 1, rate: 1000, tax: 5 },
            { description: 'Luxury Desert Safari', qty: 1, rate: 2000, tax: 5 },
            { description: 'Airport VIP Transfer', qty: 2, rate: 500, tax: 5 },
          ],
          discount_amount: 800,
          paid_amount: 1360,
          payment_terms: 'CASH',
        });

      expect(quoteRes.status).toBe(201);
      expect(quoteRes.body.success).toBe(true);

      const quote = quoteRes.body.data;
      expect(quote.subtotal).toBe(4000);
      expect(quote.discount_amount).toBe(800);
      expect(quote.total_tax).toBe(160);
      expect(quote.grand_total).toBe(3360);
      expect(quote.paid_amount).toBe(1360);
      expect(quote.balance_amount).toBe(2000);
    });
  });
});
