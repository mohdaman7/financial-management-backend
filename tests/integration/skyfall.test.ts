import { getTestAgent } from '../helpers/testApp';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import { ServiceModel } from '../../src/modules/service/infrastructure/models/Service.model';
import bcrypt from 'bcrypt';

describe('Skyfall International Travels — Auth & Services API Integration', () => {
  let createdServiceId: string;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('SecurePassword123!', 10);

    // Seed Super Admin
    await UserModel.create({
      name: 'CHIEF EXECUTIVE',
      email: 'superadmin@skyfall.ae',
      passwordHash,
      role: 'super_admin',
      isSuperAdmin: true,
      avatar_color: 'bg-purple-600',
      avatar_initials: 'CE',
    });

    // Seed Admin
    await UserModel.create({
      name: 'SAMEER EDAKKADAMBAN',
      email: 'admin@skyfall.ae',
      passwordHash,
      role: 'admin',
      isSuperAdmin: false,
      avatar_color: 'bg-blue-600',
      avatar_initials: 'SE',
    });

    // Seed Employee
    await UserModel.create({
      name: 'HUDA MANSOOR',
      email: 'employee@skyfall.ae',
      passwordHash,
      role: 'employee',
      isSuperAdmin: false,
      avatar_color: 'bg-emerald-600',
      avatar_initials: 'HM',
    });
  });

  describe('1. Authentication Endpoints (/v1/auth & /api/v1/auth)', () => {
    it('POST /v1/auth/login should authenticate Super Admin and return exact payload structure', async () => {
      const res = await getTestAgent().post('/v1/auth/login').send({
        email: 'superadmin@skyfall.ae',
        password: 'SecurePassword123!',
        role: 'super_admin',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Authentication successful');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.expires_in).toBe(86400);
      expect(res.body.data.user.name).toBe('CHIEF EXECUTIVE');
      expect(res.body.data.user.email).toBe('superadmin@skyfall.ae');
      expect(res.body.data.user.role).toBe('super_admin');
      expect(res.body.data.user.avatar_color).toBe('bg-purple-600');
      expect(res.body.data.user.avatar_initials).toBe('CE');
    });

    it('POST /v1/auth/login should authenticate Admin and Employee', async () => {
      const adminRes = await getTestAgent().post('/v1/auth/login').send({
        email: 'admin@skyfall.ae',
        password: 'SecurePassword123!',
        role: 'admin',
      });
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.user.role).toBe('admin');

      const empRes = await getTestAgent().post('/v1/auth/login').send({
        email: 'employee@skyfall.ae',
        password: 'SecurePassword123!',
        role: 'employee',
      });
      expect(empRes.status).toBe(200);
      expect(empRes.body.data.user.role).toBe('employee');
    });

    it('POST /v1/auth/login should reject invalid credentials with 401', async () => {
      const res = await getTestAgent().post('/v1/auth/login').send({
        email: 'admin@skyfall.ae',
        password: 'WrongPassword!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('GET /v1/auth/me should return current user profile and role permissions', async () => {
      const loginRes = await getTestAgent().post('/v1/auth/login').send({
        email: 'superadmin@skyfall.ae',
        password: 'SecurePassword123!',
      });
      const token = loginRes.body.data.token;

      const res = await getTestAgent().get('/v1/auth/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('CHIEF EXECUTIVE');
      expect(res.body.data.role).toBe('super_admin');
      expect(res.body.data.permissions).toBeInstanceOf(Array);
      expect(res.body.data.permissions).toContain('manage_users');
    });

    it('POST /v1/auth/refresh and POST /v1/auth/logout should refresh and terminate session', async () => {
      const loginRes = await getTestAgent().post('/v1/auth/login').send({
        email: 'admin@skyfall.ae',
        password: 'SecurePassword123!',
      });
      const refreshToken = loginRes.body.data.refreshToken;
      const accessToken = loginRes.body.data.token;

      // Refresh
      const refreshRes = await getTestAgent().post('/v1/auth/refresh').send({
        refresh_token: refreshToken,
      });
      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.data.token).toBeDefined();

      // Logout
      const logoutRes = await getTestAgent()
        .post('/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refresh_token: refreshToken });

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);
      expect(logoutRes.body.message).toBe('User logged out successfully');
    });
  });

  describe('2. Services Catalog Endpoints (/v1/services & /api/v1/services)', () => {
    beforeEach(async () => {
      // Seed initial service
      const s = await ServiceModel.create({
        name: 'GOLDEN VISA 10-YEAR PROCESSING',
        serviceName: 'GOLDEN VISA 10-YEAR PROCESSING',
        category: 'UAE Visa & Immigration Services',
        sub_category: 'Investor & Executive Visa',
        icon: 'Globe',
        description:
          'Complete 10-year residency visa processing for investors, executives, and high-net-worth individuals.',
        government_department: 'GDRFA / ICP Dubai',
        country: 'United Arab Emirates',
        required_documents: ['Valid Passport Copy', 'Title Deed'],
        eligibility: 'Property value AED 2M+',
        processing_time: '5 - 7 Business Days',
        government_fee: 3850.0,
        company_service_charge: 2500.0,
        total_cost: 6350.0,
        currency: 'AED',
        priority: 'urgent',
        status: 'active',
        approval_required: true,
        tags: ['Golden Visa', 'VIP'],
        faqs: [{ q: 'Can I sponsor my family?', a: 'Yes.' }],
        required_steps: [{ step: 'Step 1', description: 'Initial nomination' }],
        documents_checklist: ['Passport Scan', 'Title Deed'],
      });
      createdServiceId = s._id.toString();
    });

    it('GET /v1/services should list services with search, filters, and pagination meta', async () => {
      const res = await getTestAgent().get('/v1/services').query({
        category: 'UAE Visa & Immigration Services',
        status: 'active',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].name).toBe('GOLDEN VISA 10-YEAR PROCESSING');
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('GET /v1/services/:id should retrieve detailed service specification', async () => {
      const res = await getTestAgent().get(`/v1/services/${createdServiceId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('GOLDEN VISA 10-YEAR PROCESSING');
      expect(res.body.data.government_fee).toBe(3850);
      expect(res.body.data.total_cost).toBe(6350);
    });

    it('POST /v1/services should create a new service with all specification fields', async () => {
      const loginRes = await getTestAgent().post('/v1/auth/login').send({
        email: 'superadmin@skyfall.ae',
        password: 'SecurePassword123!',
      });
      const token = loginRes.body.data.token;

      const payload = {
        name: 'NEW EMPLOYMENT VISA 2-YEAR',
        category: 'UAE Visa & Immigration Services',
        sub_category: 'Employment Residency',
        icon: 'Briefcase',
        description: 'Full processing for 2-year UAE private sector employment visa.',
        government_department: 'MOHRE / GDRFA',
        country: 'United Arab Emirates',
        required_documents: ['Passport Copy', 'Attested Degree Certificate'],
        eligibility: 'Valid job offer',
        processing_time: '3 - 5 Business Days',
        government_fee: 1850.0,
        company_service_charge: 1200.0,
        total_cost: 3050.0,
        currency: 'AED',
        priority: 'high',
        status: 'active',
        approval_required: true,
        tags: ['MOHRE', 'Employment Visa'],
      };

      const res = await getTestAgent()
        .post('/v1/services')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Service created successfully');
      expect(res.body.data.name).toBe('NEW EMPLOYMENT VISA 2-YEAR');
      expect(res.body.data.total_cost).toBe(3050);
    });

    it('PUT /v1/services/:id should update existing service', async () => {
      const loginRes = await getTestAgent().post('/v1/auth/login').send({
        email: 'superadmin@skyfall.ae',
        password: 'SecurePassword123!',
      });
      const token = loginRes.body.data.token;

      const res = await getTestAgent()
        .put(`/v1/services/${createdServiceId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          government_fee: 3900.0,
          company_service_charge: 2600.0,
          total_cost: 6500.0,
          priority: 'urgent',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Service updated successfully');
    });

    it('DELETE /v1/services/:id should delete service', async () => {
      const loginRes = await getTestAgent().post('/v1/auth/login').send({
        email: 'superadmin@skyfall.ae',
        password: 'SecurePassword123!',
      });
      const token = loginRes.body.data.token;

      const res = await getTestAgent()
        .delete(`/v1/services/${createdServiceId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Service deleted successfully');
    });
  });
});
