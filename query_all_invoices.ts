import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const InvoiceSchema = new mongoose.Schema({}, { strict: false });
const InvoiceModel = mongoose.model('Invoice', InvoiceSchema);
const CustomerSchema = new mongoose.Schema({}, { strict: false });
const CustomerModel = mongoose.model('Customer', CustomerSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB");

  const customer = await CustomerModel.findOne({ name: /ANGAD KT/i });
  console.log("Customer:", customer ? customer._id : "Not Found");

  if (customer) {
    const invoices = await InvoiceModel.find({ customer_id: customer._id }, { invoice_number: 1, grand_total: 1, paid_amount: 1, balance_amount: 1, advance_paid: 1, createdAt: 1, status: 1 }).sort({ createdAt: 1 }).lean();
    console.log("Invoices for customer:");
    console.dir(invoices, { depth: null });
  }

  process.exit(0);
}

run().catch(console.error);
