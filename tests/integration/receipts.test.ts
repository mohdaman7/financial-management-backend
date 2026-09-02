import { getTestAgent } from '../helpers/testApp';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import { CompanyModel } from '../../src/modules/company/infrastructure/models/Company.model';
import { ReceiptModel } from '../../src/modules/finance/infrastructure/models/Receipt.model';
import { TravelInvoiceModel } from '../../src/modules/travel/infrastructure/models/TravelInvoice.model';
import { CustomerModel } from '../../src/modules/customer/infrastructure/models/Customer.model';
import bcrypt from 'bcrypt';
import { Types } from 'mongoose';

describe('Skyfall International Travels — Receipts & Payment Inflow API', () => {
  let authToken: string;
  let _companyId: string;
  let sampleReceiptId: string;
  let sampleInvoiceId: string;
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

    // Seed customer
    const customer = await CustomerModel.create({
      companyId: company._id,
      name: 'AL VOLGA TRADING LLC',
      email: 'volga@skyfall.ae',
      phone: '+971 50 123 4567',
      status: 'active',
      total_spent: 0,
    });
    sampleCustomerId = customer._id.toString();

    // Seed invoice for FIFO allocation
    const invoice = await TravelInvoiceModel.create({
      companyId: company._id,
      bookingId: new Types.ObjectId(),
      invoiceNumber: 'INV-1024',
      amount: 1200.0,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: 'unpaid',
      payments: [
        {
          amount: 1000.0,
          date: new Date(),
          paymentMethod: 'bank_transfer',
        },
      ],
    });
    sampleInvoiceId = invoice._id.toString();

    // Seed sample receipt
    const receipt = await ReceiptModel.create({
      companyId: company._id,
      invoiceId: invoice._id,
      customerId: customer._id,
      reference: 'REC-0081',
      customerName: 'AL VOLGA TRADING LLC',
      paymentMethod: 'Bank Transfer',
      amount: 1000.0,
      currency: 'AED',
      date: '2026-08-03',
      bank_account: 'Emirates NBD - Main Account',
      transaction_reference: 'TRX-ENBD-998201',
      notes: 'Bank settlement advance payment for business setup services.',
      received_by: 'SAMEER EDAKKADAMBAN',
      status: 'Received',
      allocations: [
        {
          invoice_id: 'INV-1024',
          allocated_amount: 1000.0,
          remaining_invoice_balance: 200.0,
        },
      ],
    });
    sampleReceiptId = receipt._id.toString();
  });

  describe('1. Payment Receipt Vouchers CRUD & FIFO Allocations', () => {
    it('POST /v1/receipts should issue receipt voucher and allocate payment to invoice', async () => {
      const payload = {
        invoiceId: sampleInvoiceId,
        customerId: sampleCustomerId,
        customerName: 'AL VOLGA TRADING LLC',
        paymentMethod: 'Cash',
        amount: 200.0,
        currency: 'AED',
        date: '2026-08-07',
        reference: 'REC-0084',
        bank_account: 'Main Cash Drawer',
        notes: 'Cash settlement for remaining balance of INV-1024.',
        received_by: 'HUDA MANSOOR',
        status: 'Received',
      };

      const res = await getTestAgent()
        .post('/v1/receipts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Receipt voucher created successfully');
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.reference).toBe('REC-0084');
      expect(res.body.data.amount).toBe(200.0);
      expect(res.body.data.allocations).toBeInstanceOf(Array);
      expect(res.body.data.allocations[0].remaining_invoice_balance).toBe(0);
    });

    it('GET /v1/receipts should list receipt vouchers with payment method and search filters', async () => {
      const res = await getTestAgent()
        .get('/v1/receipts')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          payment_method: 'Bank Transfer',
          search: 'VOLGA',
          page: 1,
          limit: 20,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].reference).toBe('REC-0081');
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('GET /v1/receipts/:id should return single receipt voucher with allocation details', async () => {
      const res = await getTestAgent()
        .get(`/v1/receipts/${sampleReceiptId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(sampleReceiptId);
      expect(res.body.data.reference).toBe('REC-0081');
      expect(res.body.data.allocations).toHaveLength(1);
      expect(res.body.data.allocations[0].invoice_id).toBe('INV-1024');
    });

    it('PUT /v1/receipts/:id should update receipt notes and transaction reference', async () => {
      const res = await getTestAgent()
        .put(`/v1/receipts/${sampleReceiptId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'Received',
          transaction_reference: 'CHEQUE-CLEAR-88192',
          notes: 'Cheque cleared by Emirates NBD.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Receipt voucher updated successfully');
      expect(res.body.data.transaction_reference).toBe('CHEQUE-CLEAR-88192');
    });

    it('POST /v1/receipts should handle snake_case payload and string invoice number safely', async () => {
      const payload = {
        invoice_id: 'INV-1024',
        customer_id: sampleCustomerId,
        customer_name: 'AL VOLGA TRADING LLC',
        payment_method: 'bank_transfer',
        amount: 100.0,
      };

      const res = await getTestAgent()
        .post('/v1/receipts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customerName).toBe('AL VOLGA TRADING LLC');
      expect(res.body.data.paymentMethod).toBe('Bank Transfer');
      expect(res.body.data.amount).toBe(100.0);
    });

    it('POST /v1/receipts should return 400 Bad Request for invalid amount', async () => {
      const payload = {
        customer_name: 'AL VOLGA TRADING LLC',
        payment_method: 'Cash',
        amount: -50,
      };

      const res = await getTestAgent()
        .post('/v1/receipts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });
  });

  describe('2. PDF Voucher Streaming & Cancellation', () => {
    it('GET /v1/receipts/:id/pdf should stream valid payment receipt PDF voucher', async () => {
      const res = await getTestAgent()
        .get(`/v1/receipts/${sampleReceiptId}/pdf`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('application/pdf');
      expect(res.body).toBeDefined();
    });

    it('DELETE /v1/receipts/:id should cancel / void receipt voucher', async () => {
      const res = await getTestAgent()
        .delete(`/v1/receipts/${sampleReceiptId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Receipt voucher cancelled successfully');

      // Check status is updated to Cancelled
      const checkRes = await getTestAgent()
        .get(`/v1/receipts/${sampleReceiptId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(checkRes.status).toBe(200);
      expect(checkRes.body.data.status).toBe('Cancelled');
    });
  });
});
