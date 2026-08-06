import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const MONGODB_URI = process.argv[2];

if (!MONGODB_URI) {
  console.error("Please provide your MongoDB Atlas URI as an argument.");
  console.error("Usage: npx ts-node scripts/seed-admin.ts 'mongodb+srv://...'");
  process.exit(1);
}

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  isSuperAdmin: { type: Boolean, default: false },
  status: { type: String, default: 'active' }
});

const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

async function seedAdmin() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI as string);
    console.log("Connected successfully!");

    const existingAdmin = await UserModel.findOne({ email: 'superadmin@erp.com' });
    if (existingAdmin) {
      console.log("Super admin already exists!");
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash('password123', 10);
    
    await UserModel.create({
      email: 'superadmin@erp.com',
      passwordHash,
      isSuperAdmin: true,
      status: 'active'
    });

    console.log("Success! Super admin created:");
    console.log("Email: superadmin@erp.com");
    console.log("Password: password123");
    
  } catch (error) {
    console.error("Error seeding admin:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedAdmin();
