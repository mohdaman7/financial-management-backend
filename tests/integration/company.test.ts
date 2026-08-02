import { getTestAgent } from '../helpers/testApp';
import { CompanyModel } from '../../src/modules/company/infrastructure/models/Company.model';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import bcrypt from 'bcrypt';

describe('Company Module Integration Tests', () => {
  let superAdminToken: string;
  let employeeToken: string;

  beforeEach(async () => {
    // 1. Seed Company
    const company = await CompanyModel.create({ name: 'System Corp', code: 'SYSCORP' });

    // 2. Seed Users
    const passwordHash = await bcrypt.hash('password123', 10);

    // Super Admin
    await UserModel.create({
      email: 'admin@system.com',
      passwordHash,
      isSuperAdmin: true,
      currentCompanyId: company._id,
    });

    // Regular Employee
    await UserModel.create({
      email: 'staff@system.com',
      passwordHash,
      isSuperAdmin: false,
      companyId: company._id,
    });

    // Login Super Admin
    const adminRes = await getTestAgent().post('/api/v1/auth/login').send({
      email: 'admin@system.com',
      password: 'password123',
    });
    superAdminToken = adminRes.body.data.accessToken;

    // Login Employee
    const staffRes = await getTestAgent().post('/api/v1/auth/login').send({
      email: 'staff@system.com',
      password: 'password123',
    });
    employeeToken = staffRes.body.data.accessToken;
  });

  describe('POST /api/v1/companies', () => {
    it('should allow Super Admin to create a company', async () => {
      const response = await getTestAgent()
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'New Ventures Ltd',
          code: 'NVLTD',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Ventures Ltd');
      expect(response.body.data.code).toBe('NVLTD');
    });

    it('should block regular employees from creating a company', async () => {
      const response = await getTestAgent()
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          name: 'Hacker Corp',
          code: 'HACK',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SUPER_ADMIN_REQUIRED');
    });

    it('should fail if company code is duplicated', async () => {
      await getTestAgent()
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Duplicate Ventures',
          code: 'DUP',
        });

      const response = await getTestAgent()
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Duplicate Ventures 2',
          code: 'DUP',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/companies', () => {
    it('should allow Super Admin to retrieve all companies', async () => {
      const response = await getTestAgent()
        .get('/api/v1/companies')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
