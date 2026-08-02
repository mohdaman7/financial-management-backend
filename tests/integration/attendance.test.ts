import { getTestAgent } from '../helpers/testApp';
import { CompanyModel } from '../../src/modules/company/infrastructure/models/Company.model';
import { RoleModel } from '../../src/modules/auth/infrastructure/models/Role.model';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import bcrypt from 'bcrypt';
import { Types } from 'mongoose';

describe('Attendance Module Integration Tests', () => {
  let employeeToken: string;

  beforeEach(async () => {
    // 1. Seed Company
    const company = await CompanyModel.create({ name: 'Alpha Inc', code: 'ALPHA' });

    // 2. Seed Employee Role
    const role = await RoleModel.create({
      name: 'Employee',
      description: 'Employee role',
      permissions: ['view_employees'],
      companyId: company._id as Types.ObjectId,
    });

    // 3. Seed Employee User
    const passwordHash = await bcrypt.hash('password123', 10);
    await UserModel.create({
      email: 'employee@alpha.com',
      passwordHash,
      isSuperAdmin: false,
      companyId: company._id as Types.ObjectId,
      roleId: role._id as Types.ObjectId,
    });

    // Login Employee
    const loginRes = await getTestAgent().post('/api/v1/auth/login').send({
      email: 'employee@alpha.com',
      password: 'password123',
    });
    employeeToken = loginRes.body.data.accessToken;
  });

  describe('Clock In / Out Flow', () => {
    it('should complete clock-in and clock-out successfully', async () => {
      // 1. Check status (should be null initially)
      const status1 = await getTestAgent()
        .get('/api/v1/attendance/status')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(status1.status).toBe(200);
      expect(status1.body.data).toBeNull();

      // 2. Clock In
      const clockInRes = await getTestAgent()
        .post('/api/v1/attendance/clock-in')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(clockInRes.status).toBe(201);
      expect(clockInRes.body.success).toBe(true);
      expect(clockInRes.body.data).toHaveProperty('clockIn');
      expect(clockInRes.body.data.date).toBe(new Date().toISOString().split('T')[0]);

      // 3. Double Clock In should fail
      const clockInFail = await getTestAgent()
        .post('/api/v1/attendance/clock-in')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(clockInFail.status).toBe(409);

      // 4. Clock Out
      const clockOutRes = await getTestAgent()
        .post('/api/v1/attendance/clock-out')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(clockOutRes.status).toBe(200);
      expect(clockOutRes.body.success).toBe(true);
      expect(clockOutRes.body.data).toHaveProperty('clockOut');
      expect(clockOutRes.body.data.workingHours).toBeGreaterThanOrEqual(0);
    });
  });
});
