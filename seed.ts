import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { config } from './src/config';
import { UserModel } from './src/modules/auth/infrastructure/models/User.model';
import { CompanyModel } from './src/modules/company/infrastructure/models/Company.model';

async function seed() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if superadmin exists
    const existing = await UserModel.findOne({ email: 'superadmin@erp.com' });
    if (existing) {
      console.log('Superadmin already exists. You can log in with superadmin@erp.com / password123');
      process.exit(0);
    }

    // Create companies
    const c1 = await CompanyModel.create({
      name: 'Meridian Capital',
      code: 'FIN',
    });
    
    const c2 = await CompanyModel.create({
      name: 'Crest Travels',
      code: 'TRV',
    });

    const c3 = await CompanyModel.create({
      name: 'General Business',
      code: 'GEN',
    });

    const hash = await bcrypt.hash('password123', 10);
    const superAdmin = await UserModel.create({
      email: 'superadmin@erp.com',
      passwordHash: hash,
      isSuperAdmin: true,
      currentCompanyId: (c2 as any)._id, // default to travels for testing
    });

    console.log('Seeded successfully!');
    console.log('Superadmin: superadmin@erp.com');
    console.log('Password: password123');

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
