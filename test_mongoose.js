const mongoose = require('mongoose');
require('dotenv').config();
const { InvoiceModel } = require('./src/modules/finance/infrastructure/models/Invoice.model');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  try {
    const invoice = new InvoiceModel({
      invoice_number: "TEST-MONGO",
      customer_name: "Test Customer Mongoose",
      lead_by: "",
      issue_date: "2026-09-05",
      due_date: "2026-09-05",
    });

    console.log("Before save:", invoice.toObject());
    await invoice.save();
    console.log("After save:", invoice.toObject());
    await InvoiceModel.deleteOne({ _id: invoice._id });
  } catch (err) {
    console.error("Mongoose validation error:", err.message);
  }
  
  process.exit(0);
}
run();
