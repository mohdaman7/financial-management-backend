import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const CustomerSchema = new mongoose.Schema({}, { strict: false });
const CustomerModel = mongoose.model('Customer', CustomerSchema);

const EmployeeSchema = new mongoose.Schema({}, { strict: false });
const EmployeeModel = mongoose.model('Employee', EmployeeSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB");

  const customers = await CustomerModel.find({}).lean();
  const leadOwners = customers.map((c: any) => c.leadOwner || c.leadBy || c.assigned_agent).filter(Boolean);
  
  const employees = await EmployeeModel.find({}).lean();
  const empNames = employees.map((e: any) => e.name || e.full_name).filter(Boolean);
  
  console.log("Customer Lead Owners:", new Set(leadOwners));
  console.log("Employee Names:", empNames);

  process.exit(0);
}

run().catch(console.error);
