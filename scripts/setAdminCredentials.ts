import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { UserModel } from '../src/modules/auth/infrastructure/models/User.model';
import { RoleModel } from '../src/modules/auth/infrastructure/models/Role.model';
import { CompanyModel } from '../src/modules/company/infrastructure/models/Company.model';

async function setAdmin() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL || 'admin@skyfall.ae';
  const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'Admin@123456';
  const name = process.argv[4] || 'Skyfall Administrator';
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-management';

  console.log(`Connecting to MongoDB...`);
  try {
    await mongoose.connect(mongoUri);
    console.log(`Connected successfully to database.`);

    // 1. Ensure Company Exists
    let company = await CompanyModel.findOne({ code: 'SKYFALL' });
    if (!company) {
      company = await CompanyModel.findOne({});
    }
    if (!company) {
      company = await CompanyModel.create({
        name: 'Skyfall International Travels LLC',
        code: 'SKYFALL',
        taxNumber: '100234567800003',
        currency: 'AED',
      });
      console.log(`Created default company: ${company.name} (${company._id})`);
    } else {
      console.log(`Using company: ${company.name} (${company._id})`);
    }

    // 2. Ensure Admin Role Exists with Full Permissions
    const adminPermissions = [
      'manage_travel',
      'view_travel',
      'manage_finance',
      'view_finance',
      'manage_customers',
      'view_customers',
      'generate_invoices',
      'view_proposals',
      'manage_proposals',
      'manage_services',
      'view_services',
      'manage_employees',
      'view_reports',
      'approve_documents',
      'manage_settings',
    ];

    let role = await RoleModel.findOne({ name: 'Admin', companyId: company._id });
    if (!role) {
      role = await RoleModel.findOne({ name: 'Admin' });
    }
    if (!role) {
      role = await RoleModel.create({
        name: 'Admin',
        description: 'Full Administrator Access',
        permissions: adminPermissions,
        companyId: company._id,
      });
      console.log(`Created Admin role with permissions.`);
    } else {
      role.permissions = Array.from(new Set([...role.permissions, ...adminPermissions]));
      await role.save();
    }

    // 3. Hash Password & Create/Update User
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await UserModel.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      {
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        role: 'admin',
        isSuperAdmin: true,
        companyId: company._id,
        currentCompanyId: company._id,
        roleId: role._id,
        status: 'active',
      },
      { upsert: true, returnDocument: 'after' },
    );

    console.log('\n=============================================================');
    console.log('🎉 ADMIN CREDENTIALS SET SUCCESSFULLY!');
    console.log('=============================================================');
    console.log(`👤 Name:         ${user.name}`);
    console.log(`📧 Email:        ${user.email}`);
    console.log(`🔑 Password:     ${password}`);
    console.log(`🏢 Company:      ${company.name}`);
    console.log(`🆔 Company ID:   ${company._id}`);
    console.log(`🛡️ Role:         Admin (Super Admin Privileges Enabled)`);
    console.log('=============================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error('Error setting admin credentials:', err.message);
    process.exit(1);
  }
}

setAdmin();
