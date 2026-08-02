import { getTestAgent } from '../helpers/testApp';
import { CompanyModel } from '../../src/modules/company/infrastructure/models/Company.model';
import { RoleModel } from '../../src/modules/auth/infrastructure/models/Role.model';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import bcrypt from 'bcrypt';
import { Types } from 'mongoose';

describe('Dashboard Module Integration Tests', () => {
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
    const user = await UserModel.create({
      email: 'employee@alpha.com',
      passwordHash,
      isSuperAdmin: false,
      companyId: company._id as Types.ObjectId,
      roleId: role._id as Types.ObjectId,
    });

    const empModel =
      require('../../src/modules/employee/infrastructure/models/Employee.model').EmployeeModel;
    await empModel.create({
      userId: user._id,
      companyId: company._id,
      firstName: 'John',
      lastName: 'Doe',
      department: 'Engineering',
      position: 'Software Engineer',
      hireDate: new Date(),
      status: 'active',
    });

    // Login Employee
    const loginRes = await getTestAgent().post('/api/v1/auth/login').send({
      email: 'employee@alpha.com',
      password: 'password123',
    });
    employeeToken = loginRes.body.data.accessToken;

    // Seed transaction data
    const txModel =
      require('../../src/modules/finance/infrastructure/models/Transaction.model').TransactionModel;
    await txModel.create({
      companyId: company._id,
      type: 'income',
      category: 'consulting',
      amount: 3000,
      paymentMethod: 'bank_transfer',
      status: 'completed',
    });

    await txModel.create({
      companyId: company._id,
      type: 'expense',
      category: 'supplies',
      amount: 1000,
      paymentMethod: 'cash',
      status: 'completed',
    });

    await txModel.create({
      companyId: company._id,
      type: 'income',
      category: 'consulting',
      amount: 500,
      paymentMethod: 'card',
      status: 'pending',
    });

    // Seed travel booking data
    const bkModel =
      require('../../src/modules/travel/infrastructure/models/TravelBooking.model').TravelBookingModel;
    const custModel =
      require('../../src/modules/travel/infrastructure/models/TravelCustomer.model').TravelCustomerModel;
    const travelCustomer = await custModel.create({
      companyId: company._id,
      name: 'Customer Test',
      email: 'testcustomer@travel.com',
    });

    await bkModel.create({
      companyId: company._id,
      customerId: travelCustomer._id,
      status: 'confirmed',
      visaDetails: {
        status: 'pending',
        country: 'UK',
        visaType: 'Tourist',
      },
      flightDetails: {
        ticketNumber: 'TKT-999',
        airline: 'British Airways',
        departure: 'JFK',
        destination: 'LHR',
      },
    });
  });

  describe('GET /api/v1/dashboard', () => {
    it('should return aggregated dashboard metrics', async () => {
      const response = await getTestAgent()
        .get('/api/v1/dashboard')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('kpis');
      expect(response.body.data.kpis.revenue).toBe(3000);
      expect(response.body.data.kpis.expenses).toBe(1000);
      expect(response.body.data.kpis.profit).toBe(2000);
      expect(response.body.data.kpis.pendingPayments).toBe(500);
      expect(response.body.data.kpis.totalEmployees).toBe(1);
      expect(response.body.data.recentTransactions.length).toBe(3);

      // Verify travel analytics
      expect(response.body.data).toHaveProperty('travelAnalytics');
      expect(response.body.data.travelAnalytics.visaPending).toBe(1);
      expect(response.body.data.travelAnalytics.ticketsIssued).toBe(1);
      expect(response.body.data.travelAnalytics.activeTours).toBe(1);
    });
  });
});
