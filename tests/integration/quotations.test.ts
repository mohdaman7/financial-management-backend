import { getTestAgent } from '../helpers/testApp';
import { CompanyModel } from '../../src/modules/company/infrastructure/models/Company.model';
import { RoleModel } from '../../src/modules/auth/infrastructure/models/Role.model';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import { TravelProposalModel } from '../../src/modules/travel/infrastructure/models/TravelProposal.model';
import bcrypt from 'bcrypt';
import { Types } from 'mongoose';

describe('Skyfall Financial & Travels ERP — Generate Quotation API v2.4.0 Integration Tests', () => {
  let superAdminToken: string;
  let adminToken: string;
  let employeeToken: string;
  let companyId: string;
  let defaultQuotationId: string;
  let defaultQuoteRef: string;
  let defaultCustomId: string;

  beforeEach(async () => {
    // 1. Seed Company
    const company = await CompanyModel.create({
      name: 'Skyfall Travels & Tourism LLC',
      code: 'SKYFALL',
    });
    companyId = company._id.toString();

    const passwordHash = await bcrypt.hash('password123', 10);

    // 2. Seed Super Admin
    await UserModel.create({
      email: 'superadmin@skyfall.ae',
      passwordHash,
      isSuperAdmin: true,
      companyId: company._id as Types.ObjectId,
    });

    // 3. Seed Admin Role & User
    const adminRole = await RoleModel.create({
      name: 'Admin',
      description: 'Full administrative access',
      permissions: ['manage_travel', 'manage_employees', 'manage_finance', 'generate_invoices'],
      companyId: company._id as Types.ObjectId,
    });

    await UserModel.create({
      email: 'admin@skyfall.ae',
      passwordHash,
      isSuperAdmin: false,
      companyId: company._id as Types.ObjectId,
      roleId: adminRole._id as Types.ObjectId,
    });

    // 4. Seed Employee Role & User (standard staff)
    const employeeRole = await RoleModel.create({
      name: 'Employee',
      description: 'Standard staff with create/view access',
      permissions: ['view_employees'],
      companyId: company._id as Types.ObjectId,
    });

    await UserModel.create({
      email: 'employee@skyfall.ae',
      passwordHash,
      isSuperAdmin: false,
      companyId: company._id as Types.ObjectId,
      roleId: employeeRole._id as Types.ObjectId,
    });

    // 5. Authenticate all actors
    const superAdminLogin = await getTestAgent()
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@skyfall.ae', password: 'password123' });
    superAdminToken = superAdminLogin.body.data.accessToken;

    const adminLogin = await getTestAgent()
      .post('/api/v1/auth/login')
      .send({ email: 'admin@skyfall.ae', password: 'password123' });
    adminToken = adminLogin.body.data.accessToken;

    const employeeLogin = await getTestAgent()
      .post('/api/v1/auth/login')
      .send({ email: 'employee@skyfall.ae', password: 'password123' });
    employeeToken = employeeLogin.body.data.accessToken;

    // 6. Seed a baseline Quotation
    const seeded = await TravelProposalModel.create({
      companyId: company._id,
      custom_id: 'qt-7701-abcd',
      quoteRef: 'SQ-2026-0042',
      date: '2026-09-01',
      paymentTerms: 'CASH',
      customerName: 'ALEKSANDRA IGNATOVICH C/O SKYFALL ENTERPRISES',
      contactName: 'Aleksandra Ignatovich',
      customerPhone: '+971 50 123 4567',
      customerEmail: 'aleksandra@skyfall.ae',
      customerAddress: 'Business Bay, Dubai, UAE',
      passengerName: 'Aleksandra Ignatovich',
      subject: 'EMPLOYMENT VISA & PRO PROCESSING',
      createdBy: 'Skyfall International Team',
      notes: 'Quotation valid for 14 days from issue date.',
      status: 'draft',
      items: [
        {
          id: 'item-1',
          description: 'Employment Residence Visa - 2 Years',
          qty: 1,
          rate: 4500.0,
          tax: 5,
        },
        {
          id: 'item-2',
          description: 'Medical Fitness Test & Emirates ID',
          qty: 1,
          rate: 1250.0,
          tax: 5,
        },
      ],
      subtotal: 5750.0,
      discount_amount: 250.0,
      totalTax: 275.0,
      grandTotal: 5775.0,
      paid_amount: 1000.0,
      balance_amount: 4775.0,
      amountInWords: 'Five Thousand Seven Hundred Seventy-Five UAE Dirhams Only',
    });

    defaultQuotationId = seeded._id.toString();
    defaultQuoteRef = 'SQ-2026-0042';
    defaultCustomId = 'qt-7701-abcd';
  });

  describe('1. POST /api/v1/quotations — Create & Generate Quotation', () => {
    it('should calculate exact mathematical formula with proportional tax and discounts', async () => {
      const payload = {
        date: '2026-09-01',
        payment_terms: 'CASH',
        customer_name: 'ALEKSANDRA IGNATOVICH C/O SKYFALL ENTERPRISES',
        contact_name: 'Aleksandra Ignatovich',
        customer_phone: '+971 50 123 4567',
        customer_email: 'aleksandra@skyfall.ae',
        customer_address: 'Business Bay, Dubai, UAE',
        passenger_name: 'Aleksandra Ignatovich',
        subject: 'EMPLOYMENT VISA & PRO PROCESSING',
        created_by: 'Skyfall International Team',
        notes: 'Quotation valid for 14 days from issue date.',
        items: [
          {
            description: 'Employment Residence Visa - 2 Years',
            qty: 1,
            rate: 4500.0,
            tax: 5,
          },
          {
            description: 'Medical Fitness Test & Emirates ID',
            qty: 1,
            rate: 1250.0,
            tax: 5,
          },
        ],
        discount_amount: 250.0,
        paid_amount: 1000.0,
      };

      const res = await getTestAgent()
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Quotation generated successfully');

      const data = res.body.data;
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('quote_ref');
      expect(data.customer_name).toBe('ALEKSANDRA IGNATOVICH C/O SKYFALL ENTERPRISES');
      expect(data.subtotal).toBe(5750.0);
      expect(data.discount_amount).toBe(250.0);
      expect(data.total_tax).toBe(275.0);
      expect(data.grand_total).toBe(5775.0);
      expect(data.paid_amount).toBe(1000.0);
      expect(data.balance_amount).toBe(4775.0);
      expect(data.amount_in_words).toBe(
        'Five Thousand Seven Hundred Seventy-Five UAE Dirhams Only',
      );
      expect(data.items.length).toBe(2);
      expect(data.items[0].id).toBe('item-1');
      expect(data.items[1].id).toBe('item-2');
    });

    it('should reject creation when customer_name is missing (400 Bad Request)', async () => {
      const payload = {
        date: '2026-09-01',
        items: [{ description: 'Tourist Visa', qty: 1, rate: 1000 }],
      };

      const res = await getTestAgent()
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(400);
    });

    it('should reject creation when line items are empty (400 Bad Request)', async () => {
      const payload = {
        customer_name: 'JOHN DOE',
        items: [],
      };

      const res = await getTestAgent()
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(400);
    });

    it('should reject creation when quantity is zero or negative (400/422)', async () => {
      const payload = {
        customer_name: 'JOHN DOE',
        items: [{ description: 'Flight Ticket', qty: 0, rate: 1500 }],
      };

      const res = await getTestAgent()
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect([400, 422]).toContain(res.status);
    });
  });

  describe('2. GET /api/v1/quotations — List Quotations', () => {
    it('should retrieve a paginated list of quotations with metadata', async () => {
      const res = await getTestAgent()
        .get('/api/v1/quotations')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.meta).toHaveProperty('total_records');
      expect(res.body.meta).toHaveProperty('page');
      expect(res.body.meta).toHaveProperty('limit');
      expect(res.body.meta).toHaveProperty('total_pages');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should search quotations by customer name or quote reference', async () => {
      const res = await getTestAgent()
        .get('/api/v1/quotations?search=ALEKSANDRA')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].customer_name).toContain('ALEKSANDRA');
    });

    it('should filter quotations by status', async () => {
      const res = await getTestAgent()
        .get('/api/v1/quotations?status=draft')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].status).toBe('draft');
    });
  });

  describe('3. GET /api/v1/quotations/:id — Fetch Quotation Detail', () => {
    it('should fetch quotation by custom ID, quote ref, or ObjectId', async () => {
      // By Custom ID
      const resCustom = await getTestAgent()
        .get(`/api/v1/quotations/${defaultCustomId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(resCustom.status).toBe(200);
      expect(resCustom.body.status).toBe('success');
      expect(resCustom.body.data.customer_name).toBe(
        'ALEKSANDRA IGNATOVICH C/O SKYFALL ENTERPRISES',
      );

      // By Quote Ref
      const resRef = await getTestAgent()
        .get(`/api/v1/quotations/${defaultQuoteRef}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(resRef.status).toBe(200);
      expect(resRef.body.data.quote_ref).toBe(defaultQuoteRef);

      // By MongoDB ObjectId
      const resObjId = await getTestAgent()
        .get(`/api/v1/quotations/${defaultQuotationId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(resObjId.status).toBe(200);
      expect(resObjId.body.data.id).toBe(defaultCustomId);
    });

    it('should return 404 for non-existent quotation ID', async () => {
      const res = await getTestAgent()
        .get('/api/v1/quotations/qt-9999-9999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('QUOTATION_NOT_FOUND');
    });
  });

  describe('4. PUT /api/v1/quotations/:id — Update Quotation', () => {
    it('should allow Admin or Super Admin to update quotation and recalculate financials', async () => {
      const updatePayload = {
        discount_amount: 500.0,
        paid_amount: 2000.0,
        status: 'sent',
      };

      const res = await getTestAgent()
        .put(`/api/v1/quotations/${defaultCustomId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Quotation updated successfully');
      expect(res.body.data.discount_amount).toBe(500.0);
      expect(res.body.data.paid_amount).toBe(2000.0);
      // Subtotal = 5750, discount = 500, taxable = 5250, tax = 262.50, grand total = 5512.50, balance = 3512.50
      expect(res.body.data.grand_total).toBe(5512.5);
      expect(res.body.data.balance_amount).toBe(3512.5);
      expect(res.body.data.status).toBe('sent');
    });

    it('should block regular Employee without admin permissions from updating (403 Forbidden)', async () => {
      const res = await getTestAgent()
        .put(`/api/v1/quotations/${defaultCustomId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'accepted' });

      expect(res.status).toBe(403);
    });
  });

  describe('5. POST /api/v1/quotations/:id/pdf & GET /api/v1/quotations/:id/pdf — PDF Export', () => {
    it('should render and stream official quotation PDF document via POST', async () => {
      const res = await getTestAgent()
        .post(`/api/v1/quotations/${defaultCustomId}/pdf`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ include_terms: true });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment; filename=');
    });

    it('should stream PDF via GET fallback endpoint', async () => {
      const res = await getTestAgent()
        .get(`/api/v1/quotations/${defaultCustomId}/pdf`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });
  });

  describe('6. DELETE /api/v1/quotations/:id — Delete or Cancel Quotation', () => {
    it('should block non-Super Admin (Admin or Employee) from deleting quotation (403 Forbidden)', async () => {
      const resAdmin = await getTestAgent()
        .delete(`/api/v1/quotations/${defaultCustomId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resAdmin.status).toBe(403);

      const resEmp = await getTestAgent()
        .delete(`/api/v1/quotations/${defaultCustomId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(resEmp.status).toBe(403);
    });

    it('should allow Super Admin to delete quotation (200 OK)', async () => {
      const res = await getTestAgent()
        .delete(`/api/v1/quotations/${defaultCustomId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Quotation deleted successfully');

      // Verify deletion
      const checkRes = await getTestAgent()
        .get(`/api/v1/quotations/${defaultCustomId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(checkRes.status).toBe(404);
    });
  });
});
