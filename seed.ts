import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { config } from './src/config';
import { UserModel } from './src/modules/auth/infrastructure/models/User.model';
import { RoleModel } from './src/modules/auth/infrastructure/models/Role.model';
import { CompanyModel } from './src/modules/company/infrastructure/models/Company.model';
import { ServiceModel } from './src/modules/service/infrastructure/models/Service.model';

async function seed() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB for Seeding...');

    // 1. Create or Find Companies
    let skyfallCompany = await CompanyModel.findOne({ code: 'SKYFALL' });
    if (!skyfallCompany) {
      skyfallCompany = await CompanyModel.create({
        name: 'Skyfall International Travels',
        code: 'SKYFALL',
      });
    }

    let meridian = await CompanyModel.findOne({ code: 'FIN' });
    if (!meridian) {
      meridian = await CompanyModel.create({
        name: 'Meridian Capital',
        code: 'FIN',
      });
    }

    // 2. Create or Find Roles
    const superAdminRole = await RoleModel.findOneAndUpdate(
      { name: 'Super Admin' },
      {
        name: 'Super Admin',
        description: 'Full Global System Control',
        permissions: [
          'manage_users',
          'manage_workspaces',
          'view_all_finances',
          'approve_documents',
          'manage_settings',
          'manage_services',
          'view_services',
          'manage_travel',
          'view_travel',
          '*',
        ],
      },
      { upsert: true, returnDocument: 'after' },
    );

    const adminRole = await RoleModel.findOneAndUpdate(
      { name: 'Admin' },
      {
        name: 'Admin',
        description: 'Branch & Operations Control',
        permissions: [
          'view_travel',
          'manage_travel',
          'view_services',
          'manage_services',
          'generate_invoices',
          'view_customers',
          'manage_customers',
          'view_reports',
          'approve_documents',
          'create_proposals',
          'create_quotations',
        ],
      },
      { upsert: true, returnDocument: 'after' },
    );

    const employeeRole = await RoleModel.findOneAndUpdate(
      { name: 'Employee' },
      {
        name: 'Employee',
        description: 'Operations & Service Processing',
        permissions: [
          'view_travel',
          'view_services',
          'view_customers',
          'manage_assigned_customers',
          'draft_quotations',
          'view_bookings',
        ],
      },
      { upsert: true, returnDocument: 'after' },
    );

    // 3. Create or Update Default Users
    const defaultPassword = await bcrypt.hash('SecurePassword123!', 10);
    const legacyPassword = await bcrypt.hash('password123', 10);

    const usersToSeed = [
      {
        email: 'superadmin@skyfall.ae',
        name: 'CHIEF EXECUTIVE',
        role: 'super_admin' as const,
        isSuperAdmin: true,
        avatar_color: 'bg-purple-600',
        avatar_initials: 'CE',
        companyId: skyfallCompany._id,
        currentCompanyId: skyfallCompany._id,
        roleId: superAdminRole._id,
        passwordHash: defaultPassword,
      },
      {
        email: 'admin@skyfall.ae',
        name: 'SAMEER EDAKKADAMBAN',
        role: 'admin' as const,
        isSuperAdmin: false,
        avatar_color: 'bg-blue-600',
        avatar_initials: 'SE',
        companyId: skyfallCompany._id,
        currentCompanyId: skyfallCompany._id,
        roleId: adminRole._id,
        passwordHash: defaultPassword,
      },
      {
        email: 'employee@skyfall.ae',
        name: 'HUDA MANSOOR',
        role: 'employee' as const,
        isSuperAdmin: false,
        avatar_color: 'bg-emerald-600',
        avatar_initials: 'HM',
        companyId: skyfallCompany._id,
        currentCompanyId: skyfallCompany._id,
        roleId: employeeRole._id,
        passwordHash: defaultPassword,
      },
      {
        email: 'superadmin@erp.com',
        name: 'GLOBAL SUPERADMIN',
        role: 'super_admin' as const,
        isSuperAdmin: true,
        avatar_color: 'bg-purple-600',
        avatar_initials: 'GS',
        companyId: skyfallCompany._id,
        currentCompanyId: skyfallCompany._id,
        roleId: superAdminRole._id,
        passwordHash: legacyPassword,
      },
    ];

    for (const u of usersToSeed) {
      await UserModel.findOneAndUpdate(
        { email: u.email },
        { ...u, status: 'active' },
        { upsert: true, returnDocument: 'after' },
      );
      console.log(`✓ User configured: ${u.email} [${u.role}]`);
    }

    // 4. Seed Skyfall Services Catalog
    const sampleServices = [
      {
        name: 'GOLDEN VISA 10-YEAR PROCESSING',
        serviceName: 'GOLDEN VISA 10-YEAR PROCESSING',
        category: 'UAE Visa & Immigration Services',
        sub_category: 'Investor & Executive Visa',
        icon: 'Globe',
        description: 'Complete 10-year residency visa processing for investors, executives, and high-net-worth individuals.',
        government_department: 'GDRFA / ICP Dubai',
        country: 'United Arab Emirates',
        required_documents: [
          'Valid Passport Copy (min 6 months)',
          'Bank Statement (6 months)',
          'Trade Licence or Property Title Deed',
        ],
        eligibility: 'Property value of AED 2M+ or Public Investment of AED 2M+ or Executive Salary AED 30K+',
        processing_time: '5 - 7 Business Days',
        government_fee: 3850.0,
        company_service_charge: 2500.0,
        total_cost: 6350.0,
        currency: 'AED',
        priority: 'urgent' as const,
        status: 'active' as const,
        approval_required: true,
        tags: ['Golden Visa', 'VIP', 'Residency'],
        faqs: [
          {
            q: 'Can I sponsor my family?',
            a: 'Yes, Golden Visa holders can sponsor spouse, children, and parents for 10 years.',
          },
          {
            q: 'Is there a minimum stay requirement in UAE?',
            a: 'No, Golden Visa holders can stay outside the UAE for more than 6 months without losing residency.',
          },
        ],
        required_steps: [
          { step: 'Step 1', description: 'Initial nomination & eligibility evaluation' },
          { step: 'Step 2', description: 'GDRFA pre-approval submission' },
          { step: 'Step 3', description: 'Medical fitness & Emirates ID VIP appointment' },
          { step: 'Step 4', description: 'Visa stamping and Emirates ID delivery' },
        ],
        documents_checklist: [
          'Passport High-Res Color Scan',
          'Personal Photo (White Background)',
          'Title Deed / Investment Proof',
          'Attested Salary Certificate or Bank Statements',
        ],
      },
      {
        name: 'NEW EMPLOYMENT VISA 2-YEAR',
        serviceName: 'NEW EMPLOYMENT VISA 2-YEAR',
        category: 'UAE Visa & Immigration Services',
        sub_category: 'Employment Residency',
        icon: 'Briefcase',
        description: 'Full processing for 2-year UAE private sector employment visa including offer letter and quota approval.',
        government_department: 'MOHRE / GDRFA',
        country: 'United Arab Emirates',
        required_documents: [
          'Passport Copy',
          'Attested Degree Certificate',
          'Passport Photo',
          'Company Trade License Copy',
        ],
        eligibility: 'Valid job offer from UAE mainland/freezone company',
        processing_time: '3 - 5 Business Days',
        government_fee: 1850.0,
        company_service_charge: 1200.0,
        total_cost: 3050.0,
        currency: 'AED',
        priority: 'high' as const,
        status: 'active' as const,
        approval_required: true,
        tags: ['MOHRE', 'Employment Visa', 'Residency'],
        faqs: [
          {
            q: 'What is included in the company fee?',
            a: 'Offer letter creation, quota submission, labor card issuance, and visa processing coordination.',
          },
        ],
        required_steps: [
          { step: 'Step 1', description: 'Offer letter and electronic contract preparation' },
          { step: 'Step 2', description: 'MOHRE approval and Entry Permit issuance' },
          { step: 'Step 3', description: 'Medical test and Emirates ID biometrics' },
          { step: 'Step 4', description: 'Residency visa stamping' },
        ],
        documents_checklist: [
          'Passport Copy (6 months validity)',
          'Attested Education Certificate',
          'Digital Passport Photo',
          'Signed Offer Letter',
        ],
      },
      {
        name: 'DUBAI MAINLAND LLC TRADE LICENSE',
        serviceName: 'DUBAI MAINLAND LLC TRADE LICENSE',
        category: 'UAE Business Services',
        sub_category: 'Commercial Registration',
        icon: 'Building2',
        description: 'Complete formation of Dubai Department of Economy and Tourism (DET) mainland LLC company with 100% foreign ownership.',
        government_department: 'DET Dubai Economy & Tourism',
        country: 'United Arab Emirates',
        required_documents: [
          'Passport Copies of Shareholders',
          'Emirates ID (if resident)',
          'Trade Name Reservation Options (3)',
        ],
        eligibility: 'Eligible for all national and international entrepreneurs',
        processing_time: '2 - 4 Business Days',
        government_fee: 12500.0,
        company_service_charge: 4500.0,
        total_cost: 17000.0,
        currency: 'AED',
        priority: 'normal' as const,
        status: 'active' as const,
        approval_required: true,
        tags: ['Business Setup', 'Mainland', 'Trade License', 'DET'],
        faqs: [
          {
            q: 'Do I need a local UAE sponsor/partner?',
            a: 'No, mainland companies now allow 100% foreign ownership for over 1,000 commercial and industrial activities.',
          },
        ],
        required_steps: [
          { step: 'Step 1', description: 'Trade name reservation & Initial Approval' },
          { step: 'Step 2', description: 'MOA drafting and electronic notarization' },
          { step: 'Step 3', description: 'Ejari office tenancy registration' },
          { step: 'Step 4', description: 'Commercial license payment and issuance' },
        ],
        documents_checklist: [
          'Passports of all partners',
          '3 Proposed Company Names',
          'Activity Selection List',
        ],
      },
      {
        name: 'SCHENGEN TOURIST VISA APPOINTMENT & FILING',
        serviceName: 'SCHENGEN TOURIST VISA APPOINTMENT & FILING',
        category: 'Europe Services',
        sub_category: 'Tourist / Business Visa',
        icon: 'Plane',
        description: 'Complete Schengen visa application preparation, VFS/BLS appointment booking, flight/hotel itinerary, and travel insurance.',
        government_department: 'European Embassy / VFS Global',
        country: 'Europe (Schengen Zone)',
        required_documents: [
          'Original Passport (min 6 months validity)',
          'UAE Residence Visa (min 3 months validity)',
          '6 Months Bank Statement (Stamped)',
          'NOC Letter from Employer / Sponsor',
        ],
        eligibility: 'UAE residents with valid residency visa and stable bank balance',
        processing_time: '15 - 20 Business Days',
        government_fee: 420.0,
        company_service_charge: 550.0,
        total_cost: 970.0,
        currency: 'AED',
        priority: 'normal' as const,
        status: 'active' as const,
        approval_required: false,
        tags: ['Schengen', 'Europe', 'VFS', 'Tourist Visa'],
        faqs: [
          {
            q: 'Which country should I apply to?',
            a: 'You must apply to the embassy of the country where you will spend the maximum number of days or your first port of entry.',
          },
        ],
        required_steps: [
          { step: 'Step 1', description: 'Document verification and VFS/BLS slot booking' },
          { step: 'Step 2', description: 'Application form completion and flight/hotel reservation' },
          { step: 'Step 3', description: 'Biometrics and submission at Visa Application Center' },
        ],
        documents_checklist: [
          'Original Passport',
          'UAE Visa & Emirates ID Copy',
          'NOC Letter on Company Letterhead',
          '6 Months Stamped Bank Statement',
          'Passport Size Photos (35x45mm)',
        ],
      },
      {
        name: 'STUDY ABROAD CONSULTATION & UNIVERSITY ADMISSION',
        serviceName: 'STUDY ABROAD CONSULTATION & UNIVERSITY ADMISSION',
        category: 'Study Abroad Services',
        sub_category: 'Higher Education Admission',
        icon: 'BookOpen',
        description: 'End-to-end guidance for university selection, SOP review, offer letter processing, and student visa filing for UK, Canada, USA, and Europe.',
        government_department: 'University Admissions & Immigration',
        country: 'Global (UK, Canada, Europe, USA)',
        required_documents: [
          'High School / Bachelor Transcripts and Degree',
          'IELTS / TOEFL / PTE Score Card (if required)',
          'Statement of Purpose (SOP)',
          '2 Academic Letters of Recommendation (LOR)',
        ],
        eligibility: 'High school graduates or university graduates aiming for higher education abroad',
        processing_time: '2 - 4 Weeks',
        government_fee: 0.0,
        company_service_charge: 3500.0,
        total_cost: 3500.0,
        currency: 'AED',
        priority: 'normal' as const,
        status: 'active' as const,
        approval_required: false,
        tags: ['Study Abroad', 'University Admission', 'Student Visa'],
        faqs: [
          {
            q: 'Can I work while studying abroad?',
            a: 'Yes, most countries such as the UK and Canada permit students to work up to 20 hours per week during term time.',
          },
        ],
        required_steps: [
          { step: 'Step 1', description: 'Academic profile assessment & university shortlist' },
          { step: 'Step 2', description: 'SOP drafting and direct application submission' },
          { step: 'Step 3', description: 'Offer letter acceptance & CAS/I-20 issuance' },
          { step: 'Step 4', description: 'Student visa file preparation & submission' },
        ],
        documents_checklist: [
          'Academic Transcripts and Certificates',
          'English Language Test Certificate',
          'Statement of Purpose',
          'Letters of Recommendation',
          'Passport Copy',
        ],
      },
      {
        name: 'UAE 60-DAY MULTIPLE ENTRY TOURIST VISA',
        serviceName: 'UAE 60-DAY MULTIPLE ENTRY TOURIST VISA',
        category: 'Travel & Tourism Services',
        sub_category: 'Leisure & Visit Visa',
        icon: 'Plane',
        description: 'Express 60-day multiple entry visit visa for family, tourists, and business visitors to UAE.',
        government_department: 'GDRFA / ICP Dubai',
        country: 'United Arab Emirates',
        required_documents: [
          'Passport Copy (min 6 months validity)',
          'Passport Size Photo (White Background)',
        ],
        eligibility: 'Available to all international tourists and visitors',
        processing_time: '24 - 48 Hours',
        government_fee: 480.0,
        company_service_charge: 270.0,
        total_cost: 750.0,
        currency: 'AED',
        priority: 'high' as const,
        status: 'active' as const,
        approval_required: false,
        tags: ['Tourist Visa', 'Visit Visa', 'Multiple Entry'],
        faqs: [
          {
            q: 'Can this visa be extended inside UAE?',
            a: 'Yes, 60-day tourist visas can be extended for an additional 30 days within the UAE without exiting.',
          },
        ],
        required_steps: [
          { step: 'Step 1', description: 'Online document submission and security clearance check' },
          { step: 'Step 2', description: 'ICP/GDRFA electronic visa issuance' },
          { step: 'Step 3', description: 'E-Visa delivery via email and WhatsApp' },
        ],
        documents_checklist: [
          'Clear Color Passport Copy',
          'Passport Photo with White Background',
        ],
      },
    ];

    for (const s of sampleServices) {
      await ServiceModel.findOneAndUpdate(
        { name: s.name },
        { ...s, companyId: skyfallCompany._id },
        { upsert: true, returnDocument: 'after' },
      );
      console.log(`✓ Service catalog entry configured: ${s.name}`);
    }

    console.log('\n=============================================');
    console.log('✅ SKYFALL INTERNATIONAL TRAVELS SEED COMPLETE');
    console.log('=============================================');
    console.log('Default Accounts:');
    console.log('1. Super Admin: superadmin@skyfall.ae / SecurePassword123!');
    console.log('2. Admin:       admin@skyfall.ae       / SecurePassword123!');
    console.log('3. Employee:    employee@skyfall.ae    / SecurePassword123!');
    console.log('4. Legacy:      superadmin@erp.com     / password123');
    console.log('=============================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();

