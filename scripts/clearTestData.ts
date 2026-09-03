import 'dotenv/config';
import mongoose from 'mongoose';
import { config } from '../src/config';
import { CustomerModel } from '../src/modules/customer/infrastructure/models/Customer.model';
import { InvoiceModel } from '../src/modules/finance/infrastructure/models/Invoice.model';
import { TravelInvoiceModel } from '../src/modules/travel/infrastructure/models/TravelInvoice.model';
import { TravelProposalModel } from '../src/modules/travel/infrastructure/models/TravelProposal.model';
import { ReceiptModel } from '../src/modules/finance/infrastructure/models/Receipt.model';
import { TransactionModel } from '../src/modules/finance/infrastructure/models/Transaction.model';
import { TravelBookingModel } from '../src/modules/travel/infrastructure/models/TravelBooking.model';
import { OfferLetterModel } from '../src/modules/employee/infrastructure/models/OfferLetter.model';
import { NotificationModel } from '../src/modules/notification/infrastructure/models/Notification.model';
import { AuditLogModel } from '../src/modules/audit/infrastructure/models/AuditLog.model';
import { AttendanceModel } from '../src/modules/attendance/infrastructure/models/Attendance.model';

async function clearTestData() {
  try {
    console.log('Connecting to MongoDB at:', config.MONGODB_URI);
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB.');

    // 1. Delete Invoices & Receipts
    const delInvoices = await InvoiceModel.deleteMany({});
    console.log(`Cleared ${delInvoices.deletedCount} standard invoices.`);

    const delTravelInvoices = await TravelInvoiceModel.deleteMany({});
    console.log(`Cleared ${delTravelInvoices.deletedCount} travel invoices.`);

    const delReceipts = await ReceiptModel.deleteMany({});
    console.log(`Cleared ${delReceipts.deletedCount} receipts.`);

    // 2. Delete Quotations & Proposals
    const delProposals = await TravelProposalModel.deleteMany({});
    console.log(`Cleared ${delProposals.deletedCount} quotations / proposals.`);

    // 3. Delete Customers
    const delCustomers = await CustomerModel.deleteMany({});
    console.log(`Cleared ${delCustomers.deletedCount} customers.`);

    // 4. Delete Transactions & Bookings
    const delTransactions = await TransactionModel.deleteMany({});
    console.log(`Cleared ${delTransactions.deletedCount} ledger transactions.`);

    const delBookings = await TravelBookingModel.deleteMany({});
    console.log(`Cleared ${delBookings.deletedCount} travel bookings.`);

    // 5. Delete Offer Letters, Notifications, Attendance & Audit Logs
    const delOfferLetters = await OfferLetterModel.deleteMany({});
    console.log(`Cleared ${delOfferLetters.deletedCount} offer letters.`);

    const delNotifications = await NotificationModel.deleteMany({});
    console.log(`Cleared ${delNotifications.deletedCount} notifications.`);

    const delAttendance = await AttendanceModel.deleteMany({});
    console.log(`Cleared ${delAttendance.deletedCount} attendance logs.`);

    const delAudit = await AuditLogModel.deleteMany({});
    console.log(`Cleared ${delAudit.deletedCount} audit logs.`);

    console.log('\n--- SUCCESS: All test data has been cleared from the database! ---');
  } catch (error) {
    console.error('Error clearing test data:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

clearTestData();
