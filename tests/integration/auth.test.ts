import { getTestAgent } from '../helpers/testApp';
import { Types } from 'mongoose';
import { CompanyModel } from '../../src/modules/company/infrastructure/models/Company.model';
import { RoleModel } from '../../src/modules/auth/infrastructure/models/Role.model';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import bcrypt from 'bcrypt';

describe('Auth & RBAC Integration Tests', () => {
  let company2Id: string;
  let employeeRoleId: string;

  beforeEach(async () => {
    // 1. Seed Companies
    const company1 = await CompanyModel.create({ name: 'Company One', code: 'COMP1' });

    const company2 = await CompanyModel.create({ name: 'Company Two', code: 'COMP2' });
    company2Id = company2._id.toString();

    // 2. Seed Roles
    const employeeRole = await RoleModel.create({
      name: 'Employee',
      description: 'Regular Employee',
      permissions: ['view_employees'],
      companyId: company1._id as Types.ObjectId,
    });
    employeeRoleId = employeeRole._id.toString();

    const managerRole = await RoleModel.create({
      name: 'Manager',
      description: 'Company Manager',
      permissions: ['view_employees', 'manage_employees', 'view_roles', 'manage_roles'],
      companyId: company1._id as Types.ObjectId,
    });

    // 3. Seed Users
    const passwordHash = await bcrypt.hash('password123', 10);

    // Regular Employee
    await UserModel.create({
      email: 'employee@comp1.com',
      passwordHash,
      isSuperAdmin: false,
      companyId: company1._id as Types.ObjectId,
      roleId: employeeRole._id as Types.ObjectId,
    });

    // Manager
    await UserModel.create({
      email: 'manager@comp1.com',
      passwordHash,
      isSuperAdmin: false,
      companyId: company1._id as Types.ObjectId,
      roleId: managerRole._id as Types.ObjectId,
    });

    // Super Admin
    await UserModel.create({
      email: 'superadmin@system.com',
      passwordHash,
      isSuperAdmin: true,
      currentCompanyId: company1._id as Types.ObjectId,
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should log in successfully with correct credentials', async () => {
      const response = await getTestAgent().post('/api/v1/auth/login').send({
        email: 'employee@comp1.com',
        password: 'password123',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe('employee@comp1.com');
    });

    it('should fail with invalid credentials', async () => {
      const response = await getTestAgent().post('/api/v1/auth/login').send({
        email: 'employee@comp1.com',
        password: 'wrongpassword',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should issue new tokens with valid refresh token', async () => {
      const loginResponse = await getTestAgent().post('/api/v1/auth/login').send({
        email: 'employee@comp1.com',
        password: 'password123',
      });

      const refreshResponse = await getTestAgent()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: loginResponse.body.data.refreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data).toHaveProperty('accessToken');
      expect(refreshResponse.body.data).toHaveProperty('refreshToken');
    });
  });

  describe('RBAC & Company Scope Authorization', () => {
    let employeeToken: string;
    let managerToken: string;
    let superAdminToken: string;

    beforeEach(async () => {
      const empRes = await getTestAgent().post('/api/v1/auth/login').send({
        email: 'employee@comp1.com',
        password: 'password123',
      });
      employeeToken = empRes.body.data.accessToken;

      const mgrRes = await getTestAgent().post('/api/v1/auth/login').send({
        email: 'manager@comp1.com',
        password: 'password123',
      });
      managerToken = mgrRes.body.data.accessToken;

      const adminRes = await getTestAgent().post('/api/v1/auth/login').send({
        email: 'superadmin@system.com',
        password: 'password123',
      });
      superAdminToken = adminRes.body.data.accessToken;
    });

    it('should allow user with manage_employees permission to create an employee', async () => {
      const response = await getTestAgent()
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          email: 'new-hire@comp1.com',
          password: 'password123',
          roleId: employeeRoleId,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('new-hire@comp1.com');
    });

    it('should block employee without manage_employees permission from creating a user', async () => {
      const response = await getTestAgent()
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          email: 'another@comp1.com',
          password: 'password123',
          roleId: employeeRoleId,
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should prevent employee from requesting data for a different company', async () => {
      const response = await getTestAgent()
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('x-company-id', company2Id);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });

    it('should allow Super Admin to access any company and switch active company context', async () => {
      // 1. Initial list of users as Super Admin context (defaults to Company 1)
      const listRes1 = await getTestAgent()
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(listRes1.status).toBe(200);

      // 2. Switch context to Company 2
      const switchRes = await getTestAgent()
        .post('/api/v1/auth/switch-company')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ companyId: company2Id });

      expect(switchRes.status).toBe(200);
      expect(switchRes.body.data).toHaveProperty('accessToken');
    });
  });

  describe('Super Admin Limits', () => {
    it('should prevent creating a 3rd Super Admin', async () => {
      const adminTokenRes = await getTestAgent().post('/api/v1/auth/login').send({
        email: 'superadmin@system.com',
        password: 'password123',
      });
      const superAdminToken = adminTokenRes.body.data.accessToken;

      // Create 2nd Super Admin (1st is already seeded in beforeEach)
      const secondAdminRes = await getTestAgent()
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'superadmin2@system.com',
          password: 'password123',
          isSuperAdmin: true,
        });
      expect(secondAdminRes.status).toBe(201);

      // Attempt to create 3rd Super Admin
      const thirdAdminRes = await getTestAgent()
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'superadmin3@system.com',
          password: 'password123',
          isSuperAdmin: true,
        });

      expect(thirdAdminRes.status).toBe(403);
      expect(thirdAdminRes.body.success).toBe(false);
      expect(thirdAdminRes.body.error.message).toContain(
        'Maximum of 2 Super Admin accounts are allowed',
      );
    });
  });
});
