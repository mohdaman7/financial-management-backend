import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const InvoiceSchema = new mongoose.Schema({}, { strict: false });
const InvoiceModel = mongoose.model('Invoice', InvoiceSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB");

  const invoice = await InvoiceModel.findOne({ invoice_number: 'SKY-2026-ST7372' }).lean();
  console.log("Invoice data:");
  console.dir(invoice, { depth: null });

  process.exit(0);
}

run().catch(console.error);
