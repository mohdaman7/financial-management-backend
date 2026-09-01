import { getTestAgent } from '../helpers/testApp';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import { CompanyModel } from '../../src/modules/company/infrastructure/models/Company.model';
import { CustomerModel } from '../../src/modules/customer/infrastructure/models/Customer.model';
import bcrypt from 'bcrypt';

describe('Skyfall International Travels — Customers CRM & Document Vault API', () => {
  let authToken: string;
  let _companyId: string;
  let sampleCustomerId: string;

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

    // Seed a sample customer for detail/update/document tests
    const customer = await CustomerModel.create({
      companyId: company._id,
      name: 'Hassan Al Rashid',
      email: 'hassan.rashid@gmail.com',
      phone: '+971 55 987 6543',
      whatsapp: '+971 55 987 6543',
      passport_number: 'Z8810293',
      passport_expiry: '2032-05-20',
      nationality: 'United Arab Emirates',
      company_name: 'Al Rashid Group',
      assigned_agent: 'HUDA MANSOOR',
      lead_source: 'google',
      status: 'lead',
      priority: 'high',
      current_service: 'Family Visa Processing',
      tags: ['Lead', 'Family Visa'],
      notes: 'Inquired for 3 family member residence visa processing.',
      total_spent: 0,
      documents: [],
      activity_log: [
        {
          action: 'PROFILE_CREATED',
          description: 'Customer profile created',
          performed_by: 'System',
          timestamp: new Date(),
        },
      ],
    });
    sampleCustomerId = customer._id.toString();
  });

  describe('1. Customer CRUD Endpoints', () => {
    it('POST /v1/customers should create a new customer lead with full specification fields', async () => {
      const payload = {
        name: 'MUHAMMED MUBASHIR K',
        email: 'mubashir.k@volgagroup.ae',
        phone: '+971 50 123 4567',
        whatsapp: '+971 50 123 4567',
        passport_number: 'N9912044',
        passport_expiry: '2031-10-15',
        nationality: 'India',
        country: 'United Arab Emirates',
        company_name: 'AL VOLGA TRADING LLC',
        assigned_agent: 'SAMEER EDAKKADAMBAN',
        lead_source: 'referral',
        status: 'vip',
        priority: 'urgent',
        current_service: 'Golden Visa 10-Year Processing',
        tags: ['Corporate', 'VIP', 'Residency'],
        notes: 'Prefers communication via WhatsApp. VIP high priority processing.',
      };

      const res = await getTestAgent()
        .post('/v1/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Customer profile created successfully');
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('MUHAMMED MUBASHIR K');
      expect(res.body.data.status).toBe('vip');
      expect(res.body.data.priority).toBe('urgent');
    });

    it('GET /v1/customers should list customers with search, status filters, and pagination', async () => {
      const res = await getTestAgent()
        .get('/v1/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          status: 'lead',
          search: 'Hassan',
          page: 1,
          limit: 20,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].name).toBe('Hassan Al Rashid');
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('GET /v1/customers/:id should return full customer profile detail', async () => {
      const res = await getTestAgent()
        .get(`/v1/customers/${sampleCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(sampleCustomerId);
      expect(res.body.data.name).toBe('Hassan Al Rashid');
      expect(res.body.data.company_name).toBe('Al Rashid Group');
      expect(res.body.data.passport_number).toBe('Z8810293');
    });

    it('PUT /v1/customers/:id should update status and log activity', async () => {
      const res = await getTestAgent()
        .put(`/v1/customers/${sampleCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'active',
          priority: 'urgent',
          current_service: 'Golden Visa Final Approval',
          notes: 'Documents approved by ICP Dubai.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Customer profile updated successfully');
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.priority).toBe('urgent');
    });
  });

  describe('2. Document Vault Endpoints', () => {
    it('POST /v1/customers/:id/documents and GET /v1/customers/:id/documents and DELETE', async () => {
      const buffer = Buffer.from('Mock Passport Document Content');

      // Upload
      const uploadRes = await getTestAgent()
        .post(`/v1/customers/${sampleCustomerId}/documents`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buffer, 'Passport_Copy_Hassan.pdf')
        .field('document_type', 'Passport')
        .field('title', 'Passport_Copy_Hassan.pdf');

      expect(uploadRes.status).toBe(201);
      expect(uploadRes.body.success).toBe(true);
      expect(uploadRes.body.message).toBe('Document uploaded to vault successfully');
      expect(uploadRes.body.data.id).toBeDefined();
      expect(uploadRes.body.data.name).toBe('Passport_Copy_Hassan.pdf');
      expect(uploadRes.body.data.type).toBe('Passport');

      const docId = uploadRes.body.data.id;

      // List
      const listRes = await getTestAgent()
        .get(`/v1/customers/${sampleCustomerId}/documents`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(listRes.body.data).toBeInstanceOf(Array);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

      // Delete
      const delRes = await getTestAgent()
        .delete(`/v1/customers/${sampleCustomerId}/documents/${docId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
      expect(delRes.body.message).toBe('Document deleted successfully');
    });
  });

  describe('3. Customer Activity Audit Trail', () => {
    it('GET /v1/customers/:id/activity-log should retrieve chronological activity log', async () => {
      // Update status first
      await getTestAgent()
        .put(`/v1/customers/${sampleCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'vip' });

      const res = await getTestAgent()
        .get(`/v1/customers/${sampleCustomerId}/activity-log`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      const actions = res.body.data.map((a: any) => a.action);
      expect(actions).toContain('STATUS_CHANGED');
    });
  });

  describe('4. Delete Customer Profile', () => {
    it('DELETE /v1/customers/:id should delete customer profile', async () => {
      const res = await getTestAgent()
        .delete(`/v1/customers/${sampleCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Customer profile deleted successfully');
    });
  });
});
