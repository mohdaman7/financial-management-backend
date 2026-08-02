import { getTestAgent } from '../helpers/testApp';
import { CompanyModel } from '../../src/modules/company/infrastructure/models/Company.model';
import { RoleModel } from '../../src/modules/auth/infrastructure/models/Role.model';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import bcrypt from 'bcrypt';
import { Types } from 'mongoose';

describe('Employee Module Integration Tests', () => {
  let company2Id: string;
  let managerToken: string;
  let employeeRoleId: string;

  beforeEach(async () => {
    // 1. Seed Companies
    const company1 = await CompanyModel.create({ name: 'Alpha Inc', code: 'ALPHA' });

    const company2 = await CompanyModel.create({ name: 'Beta Inc', code: 'BETA' });
    company2Id = company2._id.toString();

    // 2. Seed Role for company 1
    const managerRole = await RoleModel.create({
      name: 'Manager',
      description: 'Department Manager',
      permissions: ['view_employees', 'manage_employees'],
      companyId: company1._id as Types.ObjectId,
    });

    const employeeRole = await RoleModel.create({
      name: 'Employee',
      description: 'Regular Employee',
      permissions: ['view_employees'],
      companyId: company1._id as Types.ObjectId,
    });
    employeeRoleId = employeeRole._id.toString();

    // 3. Seed Manager User
    const passwordHash = await bcrypt.hash('password123', 10);
    await UserModel.create({
      email: 'manager@alpha.com',
      passwordHash,
      isSuperAdmin: false,
      companyId: company1._id as Types.ObjectId,
      roleId: managerRole._id as Types.ObjectId,
    });

    // Login Manager
    const loginRes = await getTestAgent().post('/api/v1/auth/login').send({
      email: 'manager@alpha.com',
      password: 'password123',
    });
    managerToken = loginRes.body.data.accessToken;
  });

  describe('POST /api/v1/employees', () => {
    it('should create an employee and a corresponding user account', async () => {
      const response = await getTestAgent()
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          email: 'new-employee@alpha.com',
          password: 'password123',
          roleId: employeeRoleId,
          firstName: 'John',
          lastName: 'Doe',
          department: 'Engineering',
          position: 'Software Engineer',
          phone: '1234567890',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('John');
      expect(response.body.data.lastName).toBe('Doe');

      // Verify User record was created
      const userRaw = await UserModel.findOne({ email: 'new-employee@alpha.com' });
      expect(userRaw).not.toBeNull();
    });

    it('should fail to create employee if company context is not matching', async () => {
      const response = await getTestAgent()
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('x-company-id', company2Id) // Try to create in Company 2
        .send({
          email: 'new员工@beta.com',
          password: 'password123',
          roleId: employeeRoleId,
          firstName: 'John',
          lastName: 'Doe',
          department: 'Engineering',
          position: 'Software Engineer',
        });

      // Manager is locked to Company 1, so x-company-id = Company 2 must return 403 Access Denied
      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/employees', () => {
    it('should list employees for the company', async () => {
      const response = await getTestAgent()
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
