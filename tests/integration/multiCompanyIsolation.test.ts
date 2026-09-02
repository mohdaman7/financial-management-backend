import { getTestAgent } from '../helpers/testApp';
import { Types } from 'mongoose';
import { CompanyModel } from '../../src/modules/company/infrastructure/models/Company.model';
import { RoleModel } from '../../src/modules/auth/infrastructure/models/Role.model';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import { CustomerModel } from '../../src/modules/customer/infrastructure/models/Customer.model';
import { TravelProposalModel } from '../../src/modules/travel/infrastructure/models/TravelProposal.model';
import { ReceiptModel } from '../../src/modules/finance/infrastructure/models/Receipt.model';
import bcrypt from 'bcrypt';

describe('Multi-Company Isolation & Cross-Tenant Security Tests', () => {
  let _company1Id: string;
  let company2Id: string;
  let comp1Token: string;
  let _comp2Token: string;
  let superAdminToken: string;

  let comp2CustomerId: string;
  let comp2ProposalId: string;
  let comp2ReceiptId: string;

  beforeEach(async () => {
    // 1. Seed Company 1 and Company 2
    const c1 = await CompanyModel.create({ name: 'Alpha Travel & Tourism', code: 'ALPHA' });
    _company1Id = c1._id.toString();

    const c2 = await CompanyModel.create({ name: 'Beta International', code: 'BETA' });
    company2Id = c2._id.toString();

    // 2. Seed Roles with full travel & finance permissions
    const allPermissions = [
      'view_customers',
      'manage_customers',
      'view_proposals',
      'manage_proposals',
      'view_finance',
      'manage_finance',
      'view_documents',
      'manage_documents',
    ];

    const r1 = await RoleModel.create({
      name: 'Alpha Admin',
      description: 'Alpha Admin Role',
      permissions: allPermissions,
      companyId: c1._id as Types.ObjectId,
    });

    const r2 = await RoleModel.create({
      name: 'Beta Admin',
      description: 'Beta Admin Role',
      permissions: allPermissions,
      companyId: c2._id as Types.ObjectId,
    });

    // 3. Seed Users
    const passwordHash = await bcrypt.hash('password123', 10);

    await UserModel.create({
      email: 'admin@alpha.com',
      passwordHash,
      isSuperAdmin: false,
      companyId: c1._id as Types.ObjectId,
      roleId: r1._id as Types.ObjectId,
    });

    await UserModel.create({
      email: 'admin@beta.com',
      passwordHash,
      isSuperAdmin: false,
      companyId: c2._id as Types.ObjectId,
      roleId: r2._id as Types.ObjectId,
    });

    await UserModel.create({
      email: 'superadmin@skyfall.ae',
      passwordHash,
      isSuperAdmin: true,
      companyId: c1._id as Types.ObjectId,
    });

    // 4. Authenticate Users
    const agent = getTestAgent();

    const res1 = await agent.post('/api/v1/auth/login').send({
      email: 'admin@alpha.com',
      password: 'password123',
    });
    comp1Token = res1.body.data.accessToken;

    const res2 = await agent.post('/api/v1/auth/login').send({
      email: 'admin@beta.com',
      password: 'password123',
    });
    _comp2Token = res2.body.data.accessToken;

    const resSa = await agent.post('/api/v1/auth/login').send({
      email: 'superadmin@skyfall.ae',
      password: 'password123',
    });
    superAdminToken = resSa.body.data.accessToken;

    // 5. Seed Company 2 Records
    const cust2 = await CustomerModel.create({
      companyId: c2._id as Types.ObjectId,
      name: 'Beta VIP Client',
      email: 'vip@beta.com',
      phone: '+971500000002',
    });
    comp2CustomerId = cust2._id.toString();

    const prop2 = await TravelProposalModel.create({
      companyId: c2._id as Types.ObjectId,
      title: 'QT-2026-BETA-001',
      customerName: 'Beta VIP Client',
      status: 'accepted',
      totalPrice: 15000,
      grandTotal: 15000,
      subtotal: 14285.71,
      totalTax: 714.29,
    });
    comp2ProposalId = prop2._id.toString();

    const rec2 = await ReceiptModel.create({
      companyId: c2._id as Types.ObjectId,
      reference: 'REC-BETA-001',
      customerName: 'Beta VIP Client',
      paymentMethod: 'Bank Transfer',
      amount: 15000,
      status: 'Received',
    });
    comp2ReceiptId = rec2._id.toString();
  });

  describe('1. Cross-Company Boundary Rejection', () => {
    it('should prevent Company 1 user from fetching Company 2 customer list', async () => {
      const agent = getTestAgent();
      const res = await agent.get('/api/v1/customers').set('Authorization', `Bearer ${comp1Token}`);

      expect(res.status).toBe(200);
      const items = res.body.data?.customers || res.body.data?.items || res.body.data || [];
      const betaCust = items.find(
        (c: any) => c._id === comp2CustomerId || c.name === 'Beta VIP Client',
      );
      expect(betaCust).toBeUndefined();
    });

    it('should reject Company 1 user attempting to spoof x-company-id to Company 2 (403 Forbidden)', async () => {
      const agent = getTestAgent();
      const res = await agent
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${comp1Token}`)
        .set('x-company-id', company2Id);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject Company 1 user attempting to read Company 2 quotation by ID', async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(`/api/v1/quotations/${comp2ProposalId}`)
        .set('Authorization', `Bearer ${comp1Token}`);

      expect(res.status).toBe(404);
    });

    it('should reject Company 1 user attempting to read Company 2 customer by ID', async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(`/api/v1/customers/${comp2CustomerId}`)
        .set('Authorization', `Bearer ${comp1Token}`);

      expect(res.status).toBe(404);
    });

    it('should reject Company 1 user attempting to update Company 2 customer', async () => {
      const agent = getTestAgent();
      const res = await agent
        .put(`/api/v1/customers/${comp2CustomerId}`)
        .set('Authorization', `Bearer ${comp1Token}`)
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(404);
    });

    it('should reject Company 1 user attempting to read Company 2 receipt by ID with mismatched company header', async () => {
      const agent = getTestAgent();
      const res = await agent
        .get(`/api/v1/receipts/${comp2ReceiptId}`)
        .set('Authorization', `Bearer ${comp1Token}`)
        .set('x-company-id', company2Id);

      expect(res.status).toBe(403);
    });
  });

  describe('2. Super Admin Multi-Company Switching', () => {
    it('should allow Super Admin to switch context to Company 2 and fetch its records', async () => {
      const agent = getTestAgent();
      const res = await agent
        .get('/api/v1/quotations')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-company-id', company2Id);

      expect(res.status).toBe(200);
      const items = res.body.data?.items || res.body.data || [];
      const betaQuote = items.find(
        (q: any) => q.id === comp2ProposalId || q.quote_ref === 'QT-2026-BETA-001',
      );
      expect(betaQuote).toBeDefined();
    });
  });
});
