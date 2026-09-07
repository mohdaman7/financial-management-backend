import mongoose from "mongoose";
import { InvoiceModel } from "./src/modules/finance/infrastructure/models/invoice.model";

async function run() {
  await mongoose.connect("mongodb+srv://angadktofficial_db_user:g2JjWFT7go3x4ecE@skyfallinternational.e7ckwa9.mongodb.net/financial_management?retryWrites=true&w=majority");
  
  const invoice = new InvoiceModel({
    invoice_number: "TEST-123",
    customer_name: "Test",
    lead_by: "",
    issue_date: "2026-09-05",
    due_date: "2026-09-12"
  });
  
  await invoice.save();
  console.log("Saved invoice:", invoice.lead_by, invoice.lead_owner);
  
  await InvoiceModel.deleteOne({ _id: invoice._id });
  process.exit(0);
}

run();
