import { getTestAgent } from '../helpers/testApp';
import { CompanyModel } from '../../src/modules/company/infrastructure/models/Company.model';
import { RoleModel } from '../../src/modules/auth/infrastructure/models/Role.model';
import { UserModel } from '../../src/modules/auth/infrastructure/models/User.model';
import { OfferLetterModel } from '../../src/modules/employee/infrastructure/models/OfferLetter.model';
import bcrypt from 'bcrypt';
import { Types } from 'mongoose';

describe('Skyfall Financial & Travels ERP — Generate Offer Letter API v2.4.0 Integration Tests', () => {
  let superAdminToken: string;
  let adminToken: string;
  let employeeToken: string;
  let companyId: string;
  let defaultOfferLetterId: string;
  let defaultCustomId: string;

  beforeEach(async () => {
    // 1. Seed Company
    const company = await CompanyModel.create({
      name: 'Skyfall Travels & Tourism LLC',
      code: 'SKYFALL',
    });
    companyId = company._id.toString();

    const passwordHash = await bcrypt.hash('password123', 10);

    // 2. Seed Super Admin
    await UserModel.create({
      email: 'superadmin@skyfall.ae',
      passwordHash,
      isSuperAdmin: true,
      companyId: company._id as Types.ObjectId,
    });

    // 3. Seed Admin Role & User
    const adminRole = await RoleModel.create({
      name: 'Admin',
      description: 'Full administrative access',
      permissions: ['manage_employees', 'manage_travel', 'manage_finance', 'generate_invoices'],
      companyId: company._id as Types.ObjectId,
    });

    await UserModel.create({
      email: 'admin@skyfall.ae',
      passwordHash,
      isSuperAdmin: false,
      companyId: company._id as Types.ObjectId,
      roleId: adminRole._id as Types.ObjectId,
    });

    // 4. Seed Employee Role & User (standard staff)
    const employeeRole = await RoleModel.create({
      name: 'Employee',
      description: 'Standard staff with create/view access',
      permissions: ['view_employees'],
      companyId: company._id as Types.ObjectId,
    });

    await UserModel.create({
      email: 'employee@skyfall.ae',
      passwordHash,
      isSuperAdmin: false,
      companyId: company._id as Types.ObjectId,
      roleId: employeeRole._id as Types.ObjectId,
    });

    // 5. Authenticate all actors
    const superAdminLogin = await getTestAgent()
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@skyfall.ae', password: 'password123' });
    superAdminToken = superAdminLogin.body.data.accessToken;

    const adminLogin = await getTestAgent()
      .post('/api/v1/auth/login')
      .send({ email: 'admin@skyfall.ae', password: 'password123' });
    adminToken = adminLogin.body.data.accessToken;

    const employeeLogin = await getTestAgent()
      .post('/api/v1/auth/login')
      .send({ email: 'employee@skyfall.ae', password: 'password123' });
    employeeToken = employeeLogin.body.data.accessToken;

    // 6. Seed a baseline Offer Letter
    const seededLetter = await OfferLetterModel.create({
      companyId: company._id,
      custom_id: 'ol-2026-0089',
      reference_no: 'OL/2026/89',
      company_name: 'AL FAZ INTERNATIONAL GENERAL TRADING LLC',
      company_email: 'INFO@COMPANY.CO.AE',
      employee_full_name: 'ZUHAIR ABDURAHIMAN',
      position: 'SALES OFFICER',
      offer_date: '2026-09-01',
      join_by_date: '2026-09-11',
      monthly_salary_amount: 7500,
      probation_period: '3 MONTHS',
      monthly_salary_formatted: 'AED 7,500 (SEVEN THOUSAND FIVE HUNDRED UAE DIRHAMS) PER MONTH.',
      place_of_employment: 'DUBAI, UNITED ARAB EMIRATES.',
      working_hours_standard: 'AS PER COMPANY POLICY AND UAE LABOUR LAW',
      candidate_bio: {
        dob: '1995-04-12',
        gender: 'MALE',
        nationality: 'INDIAN',
        passport_number: 'X7675579',
        passport_issue_date: '2020-05-10',
        passport_expiry_date: '2030-05-09',
        passport_place_of_issue: 'DUBAI',
        permanent_home_address: 'PERMANENT RESIDENTIAL ADDRESS, DUBAI, UAE',
      },
      status: 'Issued',
    });

    defaultOfferLetterId = seededLetter._id.toString();
    defaultCustomId = 'ol-2026-0089';
  });

  describe('1. POST /api/v1/offer-letters — Generate Offer Letter', () => {
    it('should generate a new official offer letter with automatic salary text formatting', async () => {
      const payload = {
        company_name: 'AL FAZ INTERNATIONAL GENERAL TRADING LLC',
        company_email: 'INFO@COMPANY.CO.AE',
        employee_full_name: 'MUHAMMED RASHID',
        position: 'SENIOR ACCOUNTANT',
        offer_date: '2026-09-01',
        join_by_date: '2026-09-15',
        monthly_salary_amount: 12500,
        probation_period: '6 MONTHS',
        place_of_employment: 'DUBAI, UNITED ARAB EMIRATES.',
        working_hours_standard: 'AS PER COMPANY POLICY AND UAE LABOUR LAW',
        dob: '1992-08-20',
        gender: 'Male',
        nationality: 'INDIAN',
        passport_number: 'Z9876543',
        passport_issue_date: '2021-01-15',
        passport_expiry_date: '2031-01-14',
        passport_place_of_issue: 'DUBAI',
        permanent_home_address: 'KERALA, INDIA',
      };

      const res = await getTestAgent()
        .post('/api/v1/offer-letters')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Offer letter generated successfully');

      const data = res.body.data;
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('reference_no');
      expect(data.company_name).toBe('AL FAZ INTERNATIONAL GENERAL TRADING LLC');
      expect(data.employee_full_name).toBe('MUHAMMED RASHID');
      expect(data.position).toBe('SENIOR ACCOUNTANT');
      expect(data.monthly_salary_amount).toBe(12500);
      expect(data.monthly_salary_formatted).toBe(
        'AED 12,500 (TWELVE THOUSAND FIVE HUNDRED UAE DIRHAMS) PER MONTH.',
      );
      expect(data.candidate_bio.passport_number).toBe('Z9876543');
      expect(data.candidate_bio.nationality).toBe('INDIAN');
      expect(data.candidate_bio.gender).toBe('MALE');
      expect(data.status).toBe('Issued');
    });

    it('should generate an offer letter with custom provided monthly_salary_formatted', async () => {
      const payload = {
        company_name: 'AL FAZ INTERNATIONAL GENERAL TRADING LLC',
        employee_full_name: 'SARAH CONNOR',
        position: 'OPERATIONS MANAGER',
        offer_date: '2026-09-01',
        join_by_date: '2026-09-20',
        monthly_salary_amount: 18000,
        monthly_salary_formatted: 'AED 18,000 (EIGHTEEN THOUSAND UAE DIRHAMS) ALL INCLUSIVE.',
        passport_number: 'P1234567',
      };

      const res = await getTestAgent()
        .post('/api/v1/offer-letters')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.monthly_salary_formatted).toBe(
        'AED 18,000 (EIGHTEEN THOUSAND UAE DIRHAMS) ALL INCLUSIVE.',
      );
    });

    it('should reject creation when employee_full_name is missing (400 Bad Request)', async () => {
      const payload = {
        company_name: 'AL FAZ INTERNATIONAL GENERAL TRADING LLC',
        position: 'SALES OFFICER',
        monthly_salary_amount: 5000,
        passport_number: 'X1122334',
      };

      const res = await getTestAgent()
        .post('/api/v1/offer-letters')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(400);
    });

    it('should reject creation when passport_number is missing (400 Bad Request)', async () => {
      const payload = {
        company_name: 'AL FAZ INTERNATIONAL GENERAL TRADING LLC',
        employee_full_name: 'JOHN DOE',
        position: 'DRIVER',
        monthly_salary_amount: 3000,
      };

      const res = await getTestAgent()
        .post('/api/v1/offer-letters')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(400);
    });

    it('should reject creation when monthly_salary_amount is negative or zero (400/422)', async () => {
      const payload = {
        company_name: 'AL FAZ INTERNATIONAL GENERAL TRADING LLC',
        employee_full_name: 'JOHN DOE',
        position: 'DRIVER',
        passport_number: 'N7654321',
        monthly_salary_amount: -500,
      };

      const res = await getTestAgent()
        .post('/api/v1/offer-letters')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect([400, 422]).toContain(res.status);
    });
  });

  describe('2. GET /api/v1/offer-letters — List Offer Letters', () => {
    it('should list offer letters with pagination metadata', async () => {
      const res = await getTestAgent()
        .get('/api/v1/offer-letters')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.meta).toHaveProperty('total_records');
      expect(res.body.meta).toHaveProperty('page');
      expect(res.body.meta).toHaveProperty('limit');
      expect(res.body.meta).toHaveProperty('total_pages');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should search offer letters by candidate name or passport number', async () => {
      const res = await getTestAgent()
        .get('/api/v1/offer-letters?search=ZUHAIR')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].employee_full_name).toBe('ZUHAIR ABDURAHIMAN');

      const resPassport = await getTestAgent()
        .get('/api/v1/offer-letters?search=X7675579')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resPassport.status).toBe(200);
      expect(resPassport.body.data.length).toBe(1);
    });

    it('should filter offer letters by status', async () => {
      const res = await getTestAgent()
        .get('/api/v1/offer-letters?status=Issued')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].status).toBe('Issued');
    });
  });

  describe('3. GET /api/v1/offer-letters/:id — Fetch Offer Letter Detail', () => {
    it('should fetch offer letter by custom ID or reference number', async () => {
      // By Custom ID
      const resCustom = await getTestAgent()
        .get(`/api/v1/offer-letters/${defaultCustomId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(resCustom.status).toBe(200);
      expect(resCustom.body.status).toBe('success');
      expect(resCustom.body.data.employee_full_name).toBe('ZUHAIR ABDURAHIMAN');
      expect(resCustom.body.data.candidate_bio.passport_number).toBe('X7675579');

      // By MongoDB ObjectId
      const resObjId = await getTestAgent()
        .get(`/api/v1/offer-letters/${defaultOfferLetterId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(resObjId.status).toBe(200);
      expect(resObjId.body.data.id).toBe(defaultCustomId);
    });

    it('should return 404 for non-existent offer letter ID', async () => {
      const res = await getTestAgent()
        .get('/api/v1/offer-letters/ol-9999-9999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('OFFER_LETTER_NOT_FOUND');
    });
  });

  describe('4. PUT /api/v1/offer-letters/:id — Update Offer Letter', () => {
    it('should allow Admin or Super Admin to update terms and candidate bio', async () => {
      const updatePayload = {
        position: 'SENIOR SALES CONSULTANT',
        monthly_salary_amount: 8500,
        probation_period: '6 MONTHS',
        status: 'Accepted',
      };

      const res = await getTestAgent()
        .put(`/api/v1/offer-letters/${defaultCustomId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Offer letter updated successfully');
      expect(res.body.data.position).toBe('SENIOR SALES CONSULTANT');
      expect(res.body.data.monthly_salary_amount).toBe(8500);
      expect(res.body.data.monthly_salary_formatted).toBe(
        'AED 8,500 (EIGHT THOUSAND FIVE HUNDRED UAE DIRHAMS) PER MONTH.',
      );
      expect(res.body.data.probation_period).toBe('6 MONTHS');
      expect(res.body.data.status).toBe('Accepted');
    });

    it('should block regular Employee without admin permission from updating (403 Forbidden)', async () => {
      const res = await getTestAgent()
        .put(`/api/v1/offer-letters/${defaultCustomId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ position: 'CHIEF EXECUTIVE OFFICER' });

      expect(res.status).toBe(403);
    });
  });

  describe('5. POST /api/v1/offer-letters/:id/pdf & GET /api/v1/offer-letters/:id/pdf — PDF Export', () => {
    it('should render and stream official offer letter PDF document', async () => {
      const res = await getTestAgent()
        .post(`/api/v1/offer-letters/${defaultCustomId}/pdf`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ watermark: true, include_company_stamp: true });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment; filename=');
      expect(res.body).toBeDefined();
    });

    it('should support streaming PDF via GET fallback endpoint', async () => {
      const res = await getTestAgent()
        .get(`/api/v1/offer-letters/${defaultCustomId}/pdf`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });
  });

  describe('6. DELETE /api/v1/offer-letters/:id — Revoke or Delete Offer Letter', () => {
    it('should block non-Super Admin (Admin or Employee) from deleting offer letter (403)', async () => {
      const resAdmin = await getTestAgent()
        .delete(`/api/v1/offer-letters/${defaultCustomId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resAdmin.status).toBe(403);

      const resEmp = await getTestAgent()
        .delete(`/api/v1/offer-letters/${defaultCustomId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(resEmp.status).toBe(403);
    });

    it('should allow Super Admin to delete offer letter (200 OK)', async () => {
      const res = await getTestAgent()
        .delete(`/api/v1/offer-letters/${defaultCustomId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Offer letter revoked and deleted successfully');

      // Verify deletion
      const checkRes = await getTestAgent()
        .get(`/api/v1/offer-letters/${defaultCustomId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(checkRes.status).toBe(404);
    });
  });
});
