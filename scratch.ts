import mongoose from 'mongoose';
import { InvoiceModel } from './src/modules/finance/infrastructure/models/invoice.model';
import { ReceiptModel } from './src/modules/finance/infrastructure/models/receipt.model';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/skyfall');
  const inv = await InvoiceModel.findOne({ invoice_number: 'SKY-2026-ST7479' });
  console.log("Invoice:", { paid_amount: inv?.paid_amount, advance_paid: inv?.advance_paid, balance_amount: inv?.balance_amount });
  process.exit(0);
}
run();
