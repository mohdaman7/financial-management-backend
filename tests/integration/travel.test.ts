import { getTestAgent } from '../helpers/testApp';
import { CompanyModel } from '../../src/modules/company/infrastructure/models/Company.model';
import { RoleModel } from '../../src/modules/auth/infrastructure/models/Role.model';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import bcrypt from 'bcrypt';
import { Types } from 'mongoose';

describe('Travel Module Integration Tests', () => {
  let travelToken: string;
  let companyId: string;

  beforeEach(async () => {
    // 1. Seed Company
    const company = await CompanyModel.create({ name: 'Travel Agency', code: 'TRAVAG' });
    companyId = company._id.toString();

    // 2. Seed Travel Role
    const role = await RoleModel.create({
      name: 'Travel Manager',
      description: 'Manages bookings and ticketing',
      permissions: ['view_travel', 'manage_travel', 'view_finance'],
      companyId: company._id as Types.ObjectId,
    });

    // 3. Seed User
    const passwordHash = await bcrypt.hash('password123', 10);
    await UserModel.create({
      email: 'travelagent@travag.com',
      passwordHash,
      isSuperAdmin: false,
      companyId: company._id as Types.ObjectId,
      roleId: role._id as Types.ObjectId,
    });

    // Login Agent
    const loginRes = await getTestAgent().post('/api/v1/auth/login').send({
      email: 'travelagent@travag.com',
      password: 'password123',
    });
    travelToken = loginRes.body.data.accessToken;
  });

  describe('Travel Workflow', () => {
    it('should complete travel booking, proposal, invoice, and payment cross-module flow', async () => {
      // 1. Create Travel Customer
      const custRes = await getTestAgent()
        .post('/api/v1/travel/customers')
        .set('Authorization', `Bearer ${travelToken}`)
        .send({
          name: 'Jane Doe',
          email: 'jane@gmail.com',
          phone: '9876543210',
          passportNumber: 'PASS9876',
        });
      expect(custRes.status).toBe(201);
      const customerId = custRes.body.data._id;

      // 2. Create Travel Booking (Flight + Hotel + Package)
      const bookRes = await getTestAgent()
        .post('/api/v1/travel/bookings')
        .set('Authorization', `Bearer ${travelToken}`)
        .send({
          customerId,
          flightDetails: {
            ticketNumber: 'TKT-102938',
            airline: 'Emirates',
            departure: 'DXB',
            destination: 'LHR',
          },
          hotelDetails: {
            hotelName: 'Hilton London',
            roomType: 'Deluxe Suite',
          },
          packageDetails: {
            packageName: 'London Explorer',
            durationDays: 5,
            price: 4500,
          },
        });
      expect(bookRes.status).toBe(201);
      const bookingId = bookRes.body.data._id;

      // 3. Create Proposal (Quotation)
      const propRes = await getTestAgent()
        .post('/api/v1/travel/proposals')
        .set('Authorization', `Bearer ${travelToken}`)
        .send({
          bookingId,
          title: 'London Tour Quotation',
          totalPrice: 4500,
          details: 'Includes flight, hotel, and sightseeing tours.',
        });
      expect(propRes.status).toBe(201);
      const proposalId = propRes.body.data._id;

      // 4. Approve Proposal (Creates Invoice and Confirms Booking)
      const approveRes = await getTestAgent()
        .put(`/api/v1/travel/proposals/${proposalId}/status`)
        .set('Authorization', `Bearer ${travelToken}`)
        .send({ status: 'approved' });
      expect(approveRes.status).toBe(200);

      // Verify booking is confirmed
      const getBookRes = await getTestAgent()
        .get(`/api/v1/travel/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${travelToken}`);
      expect(getBookRes.body.data.status).toBe('confirmed');

      // 5. Retrieve Generated Invoice
      const invRes = await getTestAgent()
        .get('/api/v1/travel/invoices')
        .set('Authorization', `Bearer ${travelToken}`);
      expect(invRes.status).toBe(200);
      expect(invRes.body.data.length).toBe(1);
      const invoiceId = invRes.body.data[0]._id;

      // 6. Record Payment on Invoice
      const payRes = await getTestAgent()
        .post(`/api/v1/travel/invoices/${invoiceId}/payments`)
        .set('Authorization', `Bearer ${travelToken}`)
        .send({
          amount: 4500,
          paymentMethod: 'bank_transfer',
        });
      expect(payRes.status).toBe(200);
      expect(payRes.body.data.status).toBe('paid');

      // 7. Verify cross-module integration - Finance Ledger transaction created!
      const finRes = await getTestAgent()
        .get('/api/v1/finance/transactions')
        .set('Authorization', `Bearer ${travelToken}`);
      expect(finRes.status).toBe(200);
      expect(finRes.body.data.length).toBe(1);
      expect(finRes.body.data[0].category).toBe('travel_sales');
      expect(finRes.body.data[0].amount).toBe(4500);
    });
  });
});
