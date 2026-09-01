import { getTestAgent } from '../helpers/testApp';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import { RoleModel } from '../../src/modules/auth/infrastructure/models/Role.model';
import { CompanyModel } from '../../src/modules/company/infrastructure/models/Company.model';
import bcrypt from 'bcrypt';
import { Types } from 'mongoose';

describe('Skyfall Financial & Travels ERP — Generate Invoice API v2.4.0 Integration Tests', () => {
  let superAdminToken: string;
  let adminToken: string;
  let employeeToken: string;
  let companyId: string;
  let createdInvoiceId: string;
  let createdInvoiceNumber: string;

  beforeEach(async () => {
    // 1. Create Company
    const company = await CompanyModel.create({
      name: 'Skyfall International Travels LLC',
      code: `SKYFALL-${Date.now()}`,
    });
    companyId = company._id.toString();

    // 2. Roles
    const adminRole = await RoleModel.create({
      name: 'Admin Role',
      description: 'Invoicing & Operations Admin',
      permissions: ['generate_invoices', 'manage_travel', 'manage_finance', 'view_customers'],
      companyId: company._id as Types.ObjectId,
    });

    const employeeRole = await RoleModel.create({
      name: 'Employee Role',
      description: 'Operations Staff',
      permissions: ['view_travel', 'view_customers'],
      companyId: company._id as Types.ObjectId,
    });

    const passwordHash = await bcrypt.hash('SecurePassword123!', 10);

    // 3. Super Admin User
    await UserModel.create({
      name: 'CHIEF EXECUTIVE',
      email: 'superadmin@skyfall.ae',
      passwordHash,
      role: 'super_admin',
      isSuperAdmin: true,
      companyId: company._id as Types.ObjectId,
      currentCompanyId: company._id as Types.ObjectId,
    });

    // 4. Admin User
    await UserModel.create({
      name: 'SAMEER EDAKKADAMBAN',
      email: 'admin@skyfall.ae',
      passwordHash,
      role: 'admin',
      isSuperAdmin: false,
      roleId: adminRole._id as Types.ObjectId,
      companyId: company._id as Types.ObjectId,
      currentCompanyId: company._id as Types.ObjectId,
    });

    // 5. Regular Employee User
    await UserModel.create({
      name: 'HUDA MANSOOR',
      email: 'employee@skyfall.ae',
      passwordHash,
      role: 'employee',
      isSuperAdmin: false,
      roleId: employeeRole._id as Types.ObjectId,
      companyId: company._id as Types.ObjectId,
      currentCompanyId: company._id as Types.ObjectId,
    });

    // Login Super Admin
    const saLogin = await getTestAgent().post('/api/v1/auth/login').send({
      email: 'superadmin@skyfall.ae',
      password: 'SecurePassword123!',
    });
    superAdminToken = saLogin.body.data.token || saLogin.body.data.accessToken;

    // Login Admin
    const adminLogin = await getTestAgent().post('/api/v1/auth/login').send({
      email: 'admin@skyfall.ae',
      password: 'SecurePassword123!',
    });
    adminToken = adminLogin.body.data.token || adminLogin.body.data.accessToken;

    // Login Employee
    const empLogin = await getTestAgent().post('/api/v1/auth/login').send({
      email: 'employee@skyfall.ae',
      password: 'SecurePassword123!',
    });
    employeeToken = empLogin.body.data.token || empLogin.body.data.accessToken;

    // Seed a standard invoice for query / update / export tests
    const seedRes = await getTestAgent()
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Company-ID', companyId)
      .send({
        invoice_type: 'standard',
        customer_name: 'SALEH A S QABBANI C/O AMEER NESTLE',
        care_of: 'AMEER NESTLE',
        contact_name: 'Saleh Qabbani',
        customer_phone: '+971 50 987 6543',
        lead_by: 'FAYAZTAJWEED',
        employee: 'Sameer Staff',
        category: 'Visa Services',
        issue_date: '2026-08-24',
        due_date: '2026-08-31',
        payment_terms: 'CASH',
        remarks: 'Family residence visa processing completed successfully.',
        currency: 'AED',
        items: [
          {
            item: 'Visa Service',
            description: 'Family Residence Visa - 2 Year',
            nbNo: '784-1990-1234567-1',
            name: 'SAMIA HUSSEIN SALEH ALQABBANI',
            transNo: 'TRX-8801',
            qty: 1,
            rate: 510.0,
            tax: 0,
            withdrawDt: '24/08/2026',
            account: 'Visa Revenue',
            govCost: 409.9,
            pro: 'Fayaz',
            proComm: 40.0,
            disc: 0,
          },
          {
            item: 'Visa Service',
            description: 'Emirates ID Registration Fee',
            nbNo: '784-1990-1234567-1',
            name: 'SAMIA HUSSEIN SALEH ALQABBANI',
            transNo: 'TRX-8802',
            qty: 1,
            rate: 1020.0,
            tax: 0,
            withdrawDt: '24/08/2026',
            account: 'Visa Revenue',
            govCost: 879.8,
            pro: 'Fayaz',
            proComm: 0,
            disc: 0,
          },
        ],
      });

    createdInvoiceId = seedRes.body.data.id;
    createdInvoiceNumber = seedRes.body.data.invoice_number;
  });

  describe('1. POST /api/v1/invoices — Create & Generate Invoice', () => {
    it('should create a standard tax invoice with exact financial calculations and line-item profits', async () => {
      const payload = {
        invoice_type: 'standard',
        customer_name: 'SALEH A S QABBANI C/O AMEER NESTLE',
        care_of: 'AMEER NESTLE',
        contact_name: 'Saleh Qabbani',
        customer_phone: '+971 50 987 6543',
        lead_by: 'FAYAZTAJWEED',
        employee: 'Sameer Staff',
        category: 'Visa Services',
        issue_date: '2026-08-24',
        due_date: '2026-08-31',
        payment_terms: 'CASH',
        remarks: 'Family residence visa processing completed successfully.',
        currency: 'AED',
        items: [
          {
            item: 'Visa Service',
            description: 'Family Residence Visa - 2 Year',
            nbNo: '784-1990-1234567-1',
            name: 'SAMIA HUSSEIN SALEH ALQABBANI',
            transNo: 'TRX-8801',
            qty: 1,
            rate: 510.0,
            tax: 0,
            withdrawDt: '24/08/2026',
            account: 'Visa Revenue',
            govCost: 409.9,
            pro: 'Fayaz',
            proComm: 40.0,
            disc: 0,
          },
          {
            item: 'Visa Service',
            description: 'Emirates ID Registration Fee',
            nbNo: '784-1990-1234567-1',
            name: 'SAMIA HUSSEIN SALEH ALQABBANI',
            transNo: 'TRX-8802',
            qty: 1,
            rate: 1020.0,
            tax: 0,
            withdrawDt: '24/08/2026',
            account: 'Visa Revenue',
            govCost: 879.8,
            pro: 'Fayaz',
            proComm: 0,
            disc: 0,
          },
        ],
        addition_items: [],
        deduction_items: [],
      };

      const res = await getTestAgent()
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Company-ID', companyId)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Invoice generated successfully');
      expect(res.body.data).toBeDefined();

      const data = res.body.data;
      expect(data.invoice_type).toBe('standard');
      expect(data.customer_name).toBe('SALEH A S QABBANI C/O AMEER NESTLE');
      expect(data.contact_name).toBe('Saleh Qabbani');
      expect(data.lead_by).toBe('FAYAZTAJWEED');
      expect(data.items.length).toBe(2);

      // Line 1 calculations
      expect(data.items[0].netAmount).toBe(510.0);
      expect(data.items[0].govCost).toBe(409.9);
      expect(data.items[0].totCost).toBe(409.9);
      expect(data.items[0].proComm).toBe(40.0);
      expect(data.items[0].netProfit).toBe(60.1); // 510 - 409.90 - 40 = 60.10

      // Line 2 calculations
      expect(data.items[1].netAmount).toBe(1020.0);
      expect(data.items[1].govCost).toBe(879.8);
      expect(data.items[1].totCost).toBe(879.8);
      expect(data.items[1].netProfit).toBe(140.2); // 1020 - 879.80 = 140.20

      // Totals & Profit
      expect(data.subtotal).toBe(1530.0);
      expect(data.vat).toBe(0.0);
      expect(data.additions).toBe(0.0);
      expect(data.deductions).toBe(0.0);
      expect(data.grand_total).toBe(1530.0);
      expect(data.total_profit).toBe(200.3); // 60.10 + 140.20 = 200.30
      expect(data.paid_amount).toBe(1530.0);
      expect(data.balance_amount).toBe(0.0);
      expect(data.status).toBe('Paid');
    });

    it('should create an invoice with UAE 5% VAT, additions, and deductions', async () => {
      const payload = {
        customer_name: 'EMIRATES BUSINESS CONSULTANCY',
        lead_by: 'SAMEER EDAKKADAMBAN',
        issue_date: '2026-09-01',
        due_date: '2026-09-15',
        payment_terms: 'CREDIT',
        items: [
          {
            description: 'Company Formation Legal Services',
            qty: 1,
            rate: 4000.0,
            tax: 5,
            govCost: 2500.0,
            suplFee: 200.0,
            proComm: 300.0,
          },
        ],
        addition_items: [{ particular: 'URGENT EXPRESS CHARGES', value: 300.0 }],
        deduction_items: [{ particular: 'PROMOTIONAL DISCOUNT', value: 100.0 }],
        paid_amount: 1000.0,
      };

      const res = await getTestAgent()
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      const d = res.body.data;
      expect(d.subtotal).toBe(4000.0);
      expect(d.vat).toBe(200.0); // 5% of 4000
      expect(d.additions).toBe(300.0);
      expect(d.deductions).toBe(100.0);
      expect(d.grand_total).toBe(4400.0); // 4000 + 200 + 300 - 100
      // Line net profit = 4000 - 2700 - 300 = 1000. Total profit = 1000 + 300 - 100 = 1200
      expect(d.total_profit).toBe(1200.0);
      expect(d.paid_amount).toBe(1000.0);
      expect(d.balance_amount).toBe(3400.0);
      expect(d.status).toBe('Partially Paid');
    });

    it('should create a statement voucher with ledger entries', async () => {
      const payload = {
        invoice_type: 'statement',
        customer_name: 'ROYAL HORIZON GROUP',
        lead_by: 'SAMEER EDAKKADAMBAN',
        issue_date: '2026-09-01',
        due_date: '2026-09-30',
        payment_terms: 'LEDGER',
        period_start: '2026-08-01',
        period_end: '2026-08-31',
        opening_balance: 5000.0,
        statement_entries: [
          {
            date: '2026-08-05',
            details: 'Visa Processing for 3 Candidates',
            debit: 4500.0,
            credit: 0,
          },
          {
            date: '2026-08-20',
            details: 'Bank Transfer Payment Received',
            debit: 0,
            credit: 3000.0,
          },
        ],
      };

      const res = await getTestAgent()
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.invoice_type).toBe('statement');
      expect(res.body.data.statement_entries.length).toBe(2);
    });

    it('should reject creation if customer_name is missing (400 Bad Request)', async () => {
      const res = await getTestAgent()
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          lead_by: 'SAMEER',
          issue_date: '2026-08-24',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject creation with negative rate or invalid qty (400/422)', async () => {
      const res = await getTestAgent()
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customer_name: 'TEST CUSTOMER',
          lead_by: 'SAMEER',
          items: [{ description: 'Invalid item', qty: 0, rate: -50 }],
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. GET /api/v1/invoices — List Invoices with Filtering & Pagination', () => {
    it('should retrieve a paginated list of invoices with meta information', async () => {
      const res = await getTestAgent()
        .get('/api/v1/invoices?page=1&limit=20')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(20);
      expect(res.body.meta.total_records).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.data)).toBe(true);

      const first = res.body.data[0];
      expect(first.id).toBeDefined();
      expect(first.invoice_number).toBeDefined();
      expect(first.customer_name).toBeDefined();
      expect(first.total).toBeDefined();
      expect(first.status).toBeDefined();
    });

    it('should filter invoices by lead_owner', async () => {
      const res = await getTestAgent()
        .get('/api/v1/invoices?lead_owner=FAYAZTAJWEED')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].lead_owner).toBe('FAYAZTAJWEED');
    });

    it('should search invoices by text query', async () => {
      const res = await getTestAgent()
        .get('/api/v1/invoices?search=SALEH')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].customer_name).toContain('SALEH');
    });
  });

  describe('3. GET /api/v1/invoices/:id — Fetch Invoice Detail', () => {
    it('should fetch invoice by custom ID (e.g. inv-tajweed-18501) or invoice number', async () => {
      const res = await getTestAgent()
        .get(`/api/v1/invoices/${createdInvoiceId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(createdInvoiceId);
      expect(res.body.data.items.length).toBe(2);

      // Fetch by invoice number as well
      const resByNum = await getTestAgent()
        .get(`/api/v1/invoices/${createdInvoiceNumber}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(resByNum.status).toBe(200);
      expect(resByNum.body.data.invoice_number).toBe(createdInvoiceNumber);
    });

    it('should return 404 for non-existent invoice ID', async () => {
      const res = await getTestAgent()
        .get('/api/v1/invoices/inv-nonexistent-9999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. PUT /api/v1/invoices/:id — Update Invoice', () => {
    it('should allow Admin or Super Admin to update invoice and recalculate financials', async () => {
      const updatePayload = {
        remarks: 'Updated remarks for visa processing.',
        payment_terms: 'CREDIT',
        status: 'Partially Paid',
        paid_amount: 500.0,
      };

      const res = await getTestAgent()
        .put(`/api/v1/invoices/${createdInvoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Invoice updated successfully');
      expect(res.body.data.remarks).toBe('Updated remarks for visa processing.');
      expect(res.body.data.paid_amount).toBe(500.0);
      expect(res.body.data.balance_amount).toBe(1030.0); // 1530 - 500
    });

    it('should block regular Employee without invoice management permission from updating (403)', async () => {
      const res = await getTestAgent()
        .put(`/api/v1/invoices/${createdInvoiceId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ remarks: 'Hacked remarks' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('5. POST /api/v1/invoices/:id/pdf & GET /api/v1/invoices/:id/pdf — PDF Export', () => {
    it('should render and export official PDF document via POST with custom options', async () => {
      const res = await getTestAgent()
        .post(`/api/v1/invoices/${createdInvoiceId}/pdf`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          format: 'pdf',
          print_header_logo: true,
          include_bank_details: true,
          watermark: true,
        });

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/pdf');
      expect(res.header['content-disposition']).toContain('attachment; filename=');
      expect(res.body).toBeDefined();
    });

    it('should stream PDF via GET endpoint as fallback', async () => {
      const res = await getTestAgent()
        .get(`/api/v1/invoices/${createdInvoiceId}/pdf`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/pdf');
    });
  });

  describe('6. DELETE /api/v1/invoices/:id — Delete or Void Invoice', () => {
    it('should block non-Super Admin (Admin or Employee) from deleting invoice (403)', async () => {
      const resAdmin = await getTestAgent()
        .delete(`/api/v1/invoices/${createdInvoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resAdmin.status).toBe(403);

      const resEmp = await getTestAgent()
        .delete(`/api/v1/invoices/${createdInvoiceId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(resEmp.status).toBe(403);
    });

    it('should allow Super Admin to delete invoice (200 OK)', async () => {
      const res = await getTestAgent()
        .delete(`/api/v1/invoices/${createdInvoiceId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Invoice deleted successfully');

      // Verify deletion
      const checkRes = await getTestAgent()
        .get(`/api/v1/invoices/${createdInvoiceId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(checkRes.status).toBe(404);
    });
  });
});
