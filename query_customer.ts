import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const CustomerSchema = new mongoose.Schema({}, { strict: false });
const CustomerModel = mongoose.model('Customer', CustomerSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB");

  const customer = await CustomerModel.findOne({ name: /ANGAD KT/i }).lean();
  console.log("Customer data:");
  console.dir(customer, { depth: null });

  process.exit(0);
}

run().catch(console.error);
