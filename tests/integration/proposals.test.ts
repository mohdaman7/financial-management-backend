import { getTestAgent } from '../helpers/testApp';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import { CompanyModel } from '../../src/modules/company/infrastructure/models/Company.model';
import { TravelProposalModel } from '../../src/modules/travel/infrastructure/models/TravelProposal.model';
import bcrypt from 'bcrypt';

describe('Skyfall International Travels — Proposals & Quotations API', () => {
  let authToken: string;
  let companyId: string;
  let sampleProposalId: string;

  beforeEach(async () => {
    const company = await CompanyModel.create({
      name: 'Skyfall International Travels',
      code: `SKY-${Date.now()}`,
    });
    companyId = company._id.toString();

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

    // Seed sample proposal
    const proposal = await TravelProposalModel.create({
      companyId: company._id,
      quoteRef: 'SQ-2026-0001',
      date: '2026-06-29',
      paymentTerms: '50% ADVANCE',
      customerName: 'VOLGA TRADING LLC',
      contactName: 'Muhammed Mubashir K',
      customerPhone: '+971 50 123 4567',
      customerEmail: 'volga@skyfall.ae',
      customerAddress: 'Office 402, Al Volga Tower, Business Bay, Dubai',
      passengerName: 'Muhammed Mubashir K',
      subject: 'Full Business Setup & Trade License Package',
      items: [
        {
          description: 'Trade Name Reservation & Initial Approval',
          qty: 1,
          rate: 1200.0,
          tax: 5.0,
        },
        {
          description: 'DED License Fee & Legal MOA Attestation',
          qty: 1,
          rate: 4500.0,
          tax: 5.0,
        },
        {
          description: 'Establishment Card & Service Charge',
          qty: 1,
          rate: 1800.0,
          tax: 5.0,
        },
      ],
      subtotal: 7500.0,
      totalTax: 375.0,
      grandTotal: 7875.0,
      amountInWords: 'UAE Dirham Seven Thousand Eight Hundred Seventy-Five Only',
      createdBy: 'SAMEER EDAKKADAMBAN',
      notes: 'Prices valid for 30 days. Includes government fees and PRO representation.',
      status: 'draft',
    });
    sampleProposalId = proposal._id.toString();
  });

  describe('1. Proposals / Quotations CRUD', () => {
    it('POST /v1/proposals should create a new quotation proposal with line items and taxes', async () => {
      const payload = {
        date: '2026-08-31',
        paymentTerms: 'CASH',
        customerName: 'Ahmed Al Mansouri',
        contactName: 'Ahmed Al Mansouri',
        customerPhone: '+971 50 234 5678',
        customerEmail: 'ahmed.mansouri@almansouri.ae',
        subject: 'Investor Visa & Emirates ID VIP Package',
        items: [
          {
            description: 'Investor Visa Stamping & Medical VIP',
            qty: 1,
            rate: 3200.0,
            tax: 5.0,
          },
          {
            description: 'Emirates ID 2-Year Registration',
            qty: 1,
            rate: 450.0,
            tax: 5.0,
          },
        ],
        subtotal: 3650.0,
        totalTax: 182.5,
        grandTotal: 3832.5,
        amountInWords: 'UAE Dirham Three Thousand Eight Hundred Thirty-Two and 50/100 Only',
        notes: 'Prices include government fees and express PRO service.',
        status: 'sent',
      };

      const res = await getTestAgent()
        .post('/v1/proposals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Quotation proposal generated successfully');
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.quoteRef).toBeDefined();
      expect(res.body.data.grandTotal).toBe(3832.5);
      expect(res.body.data.status).toBe('sent');
    });

    it('GET /v1/proposals should list quotations with search and status filters', async () => {
      const res = await getTestAgent()
        .get('/v1/proposals')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          status: 'draft',
          search: 'VOLGA',
          page: 1,
          limit: 20,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].customerName).toBe('VOLGA TRADING LLC');
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('GET /v1/proposals/:id should return single proposal detail and line items', async () => {
      const res = await getTestAgent()
        .get(`/v1/proposals/${sampleProposalId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(sampleProposalId);
      expect(res.body.data.quoteRef).toBe('SQ-2026-0001');
      expect(res.body.data.items).toHaveLength(3);
      expect(res.body.data.grandTotal).toBe(7875.0);
    });

    it('PUT /v1/proposals/:id should update status and payment terms', async () => {
      const res = await getTestAgent()
        .put(`/v1/proposals/${sampleProposalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'accepted',
          notes: 'Proposal accepted by client on 31 Aug 2026.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Proposal updated successfully');
      expect(res.body.data.status).toBe('accepted');
    });
  });

  describe('2. Email Delivery, PDF Download & Invoice Conversion', () => {
    it('POST /v1/proposals/:id/send-email should dispatch quotation email to recipient', async () => {
      const res = await getTestAgent()
        .post(`/v1/proposals/${sampleProposalId}/send-email`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipient_email: 'volga@skyfall.ae',
          cc_emails: ['sales@skyfall.ae'],
          custom_message:
            'Dear Client, Please find attached our official quotation for your business setup.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('volga@skyfall.ae');
    });

    it('GET /v1/proposals/:id/pdf should stream valid PDF document binary', async () => {
      const res = await getTestAgent()
        .get(`/v1/proposals/${sampleProposalId}/pdf`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('application/pdf');
      expect(res.body).toBeDefined();
    });

    it('POST /v1/proposals/:id/convert-to-invoice should convert accepted proposal directly to Tax Invoice', async () => {
      const res = await getTestAgent()
        .post(`/v1/proposals/${sampleProposalId}/convert-to-invoice`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Proposal converted to Tax Invoice successfully');
      expect(res.body.data.invoice_id).toBeDefined();
      expect(res.body.data.invoice_number).toContain('INV-');
      expect(res.body.data.proposal_id).toBe(sampleProposalId);
      expect(res.body.data.grandTotal).toBe(7875.0);
      expect(res.body.data.status).toBe('unpaid');
    });

    it('DELETE /v1/proposals/:id should delete proposal record', async () => {
      const res = await getTestAgent()
        .delete(`/v1/proposals/${sampleProposalId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Proposal deleted successfully');
    });
  });
});
