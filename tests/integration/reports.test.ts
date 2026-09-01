import { getTestAgent } from '../helpers/testApp';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import { CompanyModel } from '../../src/modules/company/infrastructure/models/Company.model';
import { CustomerModel } from '../../src/modules/customer/infrastructure/models/Customer.model';
import { TravelBookingModel } from '../../src/modules/travel/infrastructure/models/TravelBooking.model';
import { TravelProposalModel } from '../../src/modules/travel/infrastructure/models/TravelProposal.model';
import { TravelInvoiceModel } from '../../src/modules/travel/infrastructure/models/TravelInvoice.model';
import { TransactionModel } from '../../src/modules/finance/infrastructure/models/Transaction.model';
import { ServiceModel } from '../../src/modules/service/infrastructure/models/Service.model';
import bcrypt from 'bcrypt';

describe('Skyfall International Travels — Complete Reports API (Sales & Finance)', () => {
  let authToken: string;
  let _companyId: string;

  beforeEach(async () => {
    const company = await CompanyModel.create({
      name: 'Skyfall International Travels',
      code: `SKY-${Date.now()}`,
    });
    _companyId = company._id.toString();

    const passwordHash = await bcrypt.hash('SecurePassword123!', 10);
    await UserModel.create({
      name: 'SAMEER EDAKKADAMBAN',
      email: 'admin@skyfall.ae',
      passwordHash,
      role: 'admin',
      isSuperAdmin: true,
      companyId: company._id,
      currentCompanyId: company._id,
    });

    const loginRes = await getTestAgent().post('/v1/auth/login').send({
      email: 'admin@skyfall.ae',
      password: 'SecurePassword123!',
    });
    authToken = loginRes.body.data.token;

    // Seed customer
    const customer = await CustomerModel.create({
      companyId: company._id,
      name: 'MUHAMMED MUBASHIR K',
      email: 'mubashir.k@volgagroup.ae',
      phone: '+971 50 123 4567',
      status: 'vip',
      priority: 'urgent',
      lead_source: 'referral',
      total_spent: 14500,
    });

    // Seed booking
    const booking = await TravelBookingModel.create({
      companyId: company._id,
      customerId: customer._id,
      status: 'confirmed',
      packageDetails: {
        packageName: 'Golden Visa 10-Year Processing',
        durationDays: 10,
        price: 6350,
      },
    });

    // Seed proposal
    await TravelProposalModel.create({
      companyId: company._id,
      bookingId: booking._id,
      title: 'Golden Visa VIP Package',
      totalPrice: 6350,
      status: 'approved',
    });

    // Seed credit note proposal
    await TravelProposalModel.create({
      companyId: company._id,
      bookingId: booking._id,
      title: 'CN-1029 Refund Adjustment',
      totalPrice: 500,
      status: 'approved',
      details: 'Partial visa processing refund',
    });

    // Seed invoice
    await TravelInvoiceModel.create({
      companyId: company._id,
      bookingId: booking._id,
      invoiceNumber: 'INV-2026-001',
      amount: 6350,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'paid',
      payments: [
        {
          amount: 6350,
          date: new Date(),
          paymentMethod: 'bank_transfer',
        },
      ],
    });

    // Seed Income & Expense Transactions
    await TransactionModel.create({
      companyId: company._id,
      type: 'income',
      category: 'Visa Processing Revenue',
      amount: 14500,
      date: new Date(),
      paymentMethod: 'bank_transfer',
      status: 'completed',
    });

    await TransactionModel.create({
      companyId: company._id,
      type: 'expense',
      category: 'Operations',
      amount: 4500,
      date: new Date(),
      paymentMethod: 'card',
      status: 'completed',
    });

    // Seed Service
    await ServiceModel.create({
      companyId: company._id,
      name: 'Golden Visa 10-Year Processing',
      category: 'UAE Visa & Immigration',
      government_fee: 3850,
      company_service_charge: 2500,
      total_cost: 6350,
    });
  });

  describe('PART 1: Sales Reports Endpoints', () => {
    it('1. GET /v1/reports/sales/proposals should return quotations and proposals summary', async () => {
      const res = await getTestAgent()
        .get('/v1/reports/sales/proposals')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeInstanceOf(Array);
      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.summary.total_proposals).toBeGreaterThanOrEqual(1);
    });

    it('2. GET /v1/reports/sales/invoices should return invoices registry report', async () => {
      const res = await getTestAgent()
        .get('/v1/reports/sales/invoices')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeInstanceOf(Array);
      expect(res.body.data.summary.total_invoices).toBeGreaterThanOrEqual(1);
      expect(res.body.data.items[0].invoice_number).toBe('INV-2026-001');
    });

    it('3. GET /v1/reports/sales/daily should return daily sales summary breakdown', async () => {
      const res = await getTestAgent()
        .get('/v1/reports/sales/daily')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.daily_breakdown).toBeInstanceOf(Array);
      expect(res.body.data.total_sales_volume).toBeGreaterThanOrEqual(0);
    });

    it('4. GET /v1/reports/sales/monthly should return month-by-month sales totals', async () => {
      const res = await getTestAgent()
        .get('/v1/reports/sales/monthly')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ year: 2026 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.monthly_summary).toHaveLength(12);
      expect(res.body.data.year).toBe(2026);
    });

    it('5. GET /v1/reports/sales/by-service should return revenue per service breakdown', async () => {
      const res = await getTestAgent()
        .get('/v1/reports/sales/by-service')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.services).toBeInstanceOf(Array);
      expect(res.body.data.total_gross_revenue).toBeGreaterThanOrEqual(0);
    });

    it('6. GET /v1/reports/sales/by-category should return revenue grouped by business categories', async () => {
      const res = await getTestAgent()
        .get('/v1/reports/sales/by-category')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.categories).toBeInstanceOf(Array);
      expect(res.body.data.total_revenue).toBeGreaterThan(0);
    });

    it('7. GET /v1/reports/sales/by-customer should return top purchasing clients and rankings', async () => {
      const res = await getTestAgent()
        .get('/v1/reports/sales/by-customer')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.top_customers).toBeInstanceOf(Array);
      expect(res.body.data.top_customers.length).toBeGreaterThanOrEqual(1);
    });

    it('8. GET /v1/reports/sales/leads should return customer leads conversion stats and funnel', async () => {
      const res = await getTestAgent()
        .get('/v1/reports/sales/leads')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.funnel).toBeDefined();
      expect(res.body.data.sources_breakdown).toBeInstanceOf(Array);
    });

    it('9. GET /v1/reports/sales/credit-notes should return credit notes issued and refund totals', async () => {
      const res = await getTestAgent()
        .get('/v1/reports/sales/credit-notes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.credit_notes).toBeInstanceOf(Array);
      expect(res.body.data.summary.total_credit_notes).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PART 2: Finance & Accounting Reports Endpoints', () => {
    it('10. GET /v1/reports/finance/outstanding should return overdue & receivables registry', async () => {
      const res = await getTestAgent()
        .get('/v1/reports/finance/outstanding')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toBeDefined();
    });

    it('11. GET /v1/reports/finance/customer-statement should return opening/closing balance and itemized ledger', async () => {
      const res = await getTestAgent()
        .get('/v1/reports/finance/customer-statement')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.statement).toBeDefined();
      expect(res.body.data.statement.total_invoiced).toBeGreaterThanOrEqual(0);
      expect(res.body.data.ledger_entries).toBeInstanceOf(Array);
    });

    it('12. GET /v1/reports/finance/supplier-statement should return supplier payables ledger', async () => {
      const res = await getTestAgent()
        .get('/v1/reports/finance/supplier-statement')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.supplier_statements).toBeInstanceOf(Array);
      expect(res.body.data.total_payables_outstanding).toBeGreaterThan(0);
    });

    it('13. GET /v1/reports/finance/receipts should return receipts log and cash/bank inflow totals', async () => {
      const res = await getTestAgent()
        .get('/v1/reports/finance/receipts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.receipts).toBeInstanceOf(Array);
      expect(res.body.data.summary.total_inflow).toBeGreaterThanOrEqual(0);
    });

    it('14. GET /v1/reports/finance/expenses should return operating disbursements and VAT recoverable', async () => {
      const res = await getTestAgent()
        .get('/v1/reports/finance/expenses')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.expenses).toBeInstanceOf(Array);
      expect(res.body.data.summary.total_disbursements).toBeGreaterThanOrEqual(0);
    });

    it('15. GET /v1/reports/finance/profit-and-loss should return revenue, gross profit, and net operating income', async () => {
      const res = await getTestAgent()
        .get('/v1/reports/finance/profit-and-loss')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.revenue.total_revenue).toBeGreaterThan(0);
      expect(res.body.data.gross_profit).toBeDefined();
      expect(res.body.data.net_operating_income).toBeDefined();
    });

    it('16. GET /v1/reports/finance/vat-return should return UAE 5% VAT Return 201 metrics', async () => {
      const res = await getTestAgent()
        .get('/v1/reports/finance/vat-return')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ tax_period: 'Q3 2026' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.output_vat.output_vat_5_percent).toBeGreaterThanOrEqual(0);
      expect(res.body.data.input_vat.input_vat_recoverable_5_percent).toBeGreaterThanOrEqual(0);
      expect(res.body.data.net_vat_payable).toBeDefined();
    });

    it('17. GET /v1/reports/finance/pro-commission should return PRO staff commission tallies', async () => {
      const res = await getTestAgent()
        .get('/v1/reports/finance/pro-commission')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pro_commissions).toBeInstanceOf(Array);
      expect(res.body.data.total_commission_payable).toBeGreaterThan(0);
    });

    it('18. GET /v1/reports/finance/employee-performance should return team sales leaderboard', async () => {
      const res = await getTestAgent()
        .get('/v1/reports/finance/employee-performance')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.leaderboard).toBeInstanceOf(Array);
      expect(res.body.data.total_gross_revenue_team).toBeGreaterThan(0);
    });
  });
});
