import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const ReceiptSchema = new mongoose.Schema({}, { strict: false });
const ReceiptModel = mongoose.model('Receipt', ReceiptSchema);
const CustomerSchema = new mongoose.Schema({}, { strict: false });
const CustomerModel = mongoose.model('Customer', CustomerSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB");

  const customer = await CustomerModel.findOne({ name: /ANGAD KT/i });
  console.log("Customer:", customer ? customer._id : "Not Found");

  if (customer) {
    const receipts = await ReceiptModel.find({ customerId: customer._id }).lean();
    console.log("Receipts for customer:");
    console.dir(receipts, { depth: null });
  }

  process.exit(0);
}

run().catch(console.error);
