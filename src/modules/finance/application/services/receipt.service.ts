import { Types } from 'mongoose';
import {
  ReceiptRepository,
  ReceiptFilters,
  PaginationOptions,
} from '../../infrastructure/repositories/receipt.repository';
import { IReceipt, IReceiptAllocation } from '../../infrastructure/models/Receipt.model';
import { TransactionModel } from '../../infrastructure/models/Transaction.model';
import { TravelInvoiceModel } from '../../../travel/infrastructure/models/TravelInvoice.model';
import { InvoiceModel } from '../../infrastructure/models/Invoice.model';
import { CustomerModel } from '../../../customer/infrastructure/models/Customer.model';
import { AppError } from '@shared/errors/AppError';
import { PdfGenerator } from '@shared/utils/pdfGenerator';
import { CurrencyPrecision } from '@shared/utils/currencyPrecision';

export interface CreateReceiptDTO {
  invoiceId?: string;
  invoice_id?: string;
  customerId?: string;
  customer_id?: string;
  customerName?: string;
  customer_name?: string;
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'Card' | 'Online Payment' | 'Cheque' | string;
  payment_method?: string;
  amount: number;
  currency?: string;
  date?: string;
  reference?: string;
  bank_account?: string;
  bankAccount?: string;
  transaction_reference?: string;
  transactionReference?: string;
  notes?: string;
  received_by?: string;
  receivedBy?: string;
  status?: 'Received' | 'Pending' | 'Cancelled' | string;
}

function normalizePaymentMethod(method?: string): string {
  if (!method) return 'Bank Transfer';
  const clean = method.trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (clean === 'cash') return 'Cash';
  if (clean === 'banktransfer' || clean === 'bank') return 'Bank Transfer';
  if (clean === 'card' || clean === 'creditcard' || clean === 'debitcard') return 'Card';
  if (clean === 'onlinepayment' || clean === 'online') return 'Online Payment';
  if (clean === 'cheque' || clean === 'check') return 'Cheque';

  return method
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export class ReceiptService {
  constructor(private receiptRepository: ReceiptRepository) {}

  async listReceipts(
    companyId?: string,
    filters: ReceiptFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 },
  ): Promise<{ receipts: IReceipt[]; meta: { total: number; page: number; limit: number } }> {
    const { receipts, total, page, limit } = await this.receiptRepository.findFiltered(
      companyId,
      filters,
      pagination,
    );
    return { receipts, meta: { total, page, limit } };
  }

  async getReceiptById(id: string): Promise<IReceipt> {
    if (!Types.ObjectId.isValid(id)) {
      throw AppError.notFound('Receipt voucher not found');
    }
    const receipt = await this.receiptRepository.findById(id);
    if (!receipt) {
      throw AppError.notFound('Receipt voucher not found');
    }
    return receipt;
  }

  async createReceipt(
    companyId: string | undefined,
    data: CreateReceiptDTO,
    receivedBy = 'System',
  ): Promise<IReceipt> {
    const invoiceId = data.invoiceId || data.invoice_id || undefined;
    let customerId = data.customerId || data.customer_id || undefined;
    let customerName = (data.customerName || data.customer_name || '').trim();
    const paymentMethod = normalizePaymentMethod(data.paymentMethod || data.payment_method);
    const amount = CurrencyPrecision.round(Number(data.amount) || 0);

    if (amount <= 0 || isNaN(amount)) {
      throw AppError.badRequest('Receipt amount must be a positive number');
    }

    const bank_account = data.bank_account || data.bankAccount || 'Main Bank Account';
    const transaction_reference = data.transaction_reference || data.transactionReference || '';
    const notes = data.notes || '';
    const date = data.date || new Date().toISOString().split('T')[0];
    const status = data.status || 'Received';
    const currency = data.currency || 'AED';
    const finalReceivedBy = data.received_by || data.receivedBy || receivedBy;

    // Resolve Customer Details if customerName is empty
    if (customerId && Types.ObjectId.isValid(customerId)) {
      const cust = await CustomerModel.findById(customerId).exec();
      if (cust && !customerName) {
        customerName = cust.name;
      }
    }

    if (!customerName && invoiceId) {
      let invCustomerName = '';
      let invCustomerId = '';

      if (Types.ObjectId.isValid(invoiceId)) {
        const trInv = await TravelInvoiceModel.findById(invoiceId).exec();
        if (trInv && trInv.customerId) invCustomerId = trInv.customerId.toString();
        const stdInv = await InvoiceModel.findById(invoiceId).exec();
        if (stdInv) {
          invCustomerName = stdInv.customer_name;
          if (stdInv.customer_id) invCustomerId = stdInv.customer_id.toString();
        }
      } else {
        const trInv = await TravelInvoiceModel.findOne({ invoiceNumber: invoiceId }).exec();
        if (trInv && trInv.customerId) invCustomerId = trInv.customerId.toString();
        const stdInv = await InvoiceModel.findOne({ invoice_number: invoiceId }).exec();
        if (stdInv) {
          invCustomerName = stdInv.customer_name;
          if (stdInv.customer_id) invCustomerId = stdInv.customer_id.toString();
        }
      }

      if (invCustomerId && !customerId) customerId = invCustomerId;
      if (invCustomerId && !customerName) {
        const cust = await CustomerModel.findById(invCustomerId).exec();
        if (cust) customerName = cust.name;
      }
      if (invCustomerName && !customerName) customerName = invCustomerName;
    }

    if (!customerName) {
      throw AppError.badRequest('Customer name is required');
    }

    let reference = data.reference;
    if (!reference) {
      const count = await this.receiptRepository.findFiltered(companyId);
      reference = `REC-${String(count.total + 1).padStart(4, '0')}`;
    }

    const allocations: IReceiptAllocation[] = [];
    let remainingAmount = amount;

    // 1. Single Specific Invoice Allocation
    if (invoiceId) {
      let travelInvoice = Types.ObjectId.isValid(invoiceId)
        ? await TravelInvoiceModel.findById(invoiceId).exec()
        : await TravelInvoiceModel.findOne({ invoiceNumber: invoiceId }).exec();

      if (travelInvoice) {
        const totalPaid = CurrencyPrecision.round(
          (travelInvoice.payments || []).reduce((acc, p) => acc + (p.amount || 0), 0),
        );
        const due = CurrencyPrecision.round(Math.max(0, travelInvoice.amount - totalPaid));
        const allocated = CurrencyPrecision.round(Math.min(due, remainingAmount));

        const pmLower = paymentMethod.toLowerCase().replace(/[\s-]+/g, '_');
        const mapPm: 'cash' | 'bank_transfer' | 'card' | 'other' =
          pmLower === 'cash'
            ? 'cash'
            : pmLower === 'card'
            ? 'card'
            : pmLower === 'bank_transfer'
            ? 'bank_transfer'
            : 'other';

        travelInvoice.payments.push({
          amount: allocated,
          date: new Date(),
          paymentMethod: mapPm,
        });

        if (CurrencyPrecision.round(totalPaid + allocated) >= travelInvoice.amount) {
          travelInvoice.status = 'paid';
        }

        await travelInvoice.save();

        allocations.push({
          invoice_id: travelInvoice.invoiceNumber || travelInvoice._id.toString(),
          allocated_amount: allocated,
          remaining_invoice_balance: CurrencyPrecision.round(Math.max(0, due - allocated)),
        });

        remainingAmount = CurrencyPrecision.round(remainingAmount - allocated);
      } else {
        const stdInvoice = Types.ObjectId.isValid(invoiceId)
          ? await InvoiceModel.findById(invoiceId).exec()
          : await InvoiceModel.findOne({ invoice_number: invoiceId }).exec();

        if (stdInvoice) {
          const grandTotal = stdInvoice.grand_total || 0;
          const currentPaid = stdInvoice.paid_amount || 0;
          const due = CurrencyPrecision.round(Math.max(0, grandTotal - currentPaid));
          const allocated = CurrencyPrecision.round(Math.min(due, remainingAmount));

          const newPaid = CurrencyPrecision.round(currentPaid + allocated);
          const newBalance = CurrencyPrecision.round(Math.max(0, grandTotal - newPaid));

          stdInvoice.paid_amount = newPaid;
          stdInvoice.balance_amount = newBalance;
          if (newBalance <= 0) {
            stdInvoice.status = 'Paid';
          } else if (newPaid > 0) {
            stdInvoice.status = 'Partially Paid';
          }

          await stdInvoice.save();

          allocations.push({
            invoice_id: stdInvoice.invoice_number || stdInvoice._id.toString(),
            allocated_amount: allocated,
            remaining_invoice_balance: newBalance,
          });

          remainingAmount = CurrencyPrecision.round(remainingAmount - allocated);
        }
      }
    } else if (customerId || customerName) {
      // 2. FIFO multi-invoice allocation for customer debts (oldest unpaid invoice first)
      const query: any = { status: { $ne: 'paid' } };
      if (companyId && Types.ObjectId.isValid(companyId)) {
        query.companyId = new Types.ObjectId(companyId);
      }
      if (customerId && Types.ObjectId.isValid(customerId)) {
        query.customerId = new Types.ObjectId(customerId);
      }
      const unpaidInvoices = await TravelInvoiceModel.find(query).sort({ createdAt: 1 }).exec();
      for (const inv of unpaidInvoices) {
        if (remainingAmount <= 0) break;
        const totalPaid = CurrencyPrecision.round(
          (inv.payments || []).reduce((acc, p) => acc + (p.amount || 0), 0),
        );
        const due = CurrencyPrecision.round(Math.max(0, inv.amount - totalPaid));
        if (due <= 0) continue;
        const allocated = CurrencyPrecision.round(Math.min(due, remainingAmount));

        const pmLower = paymentMethod.toLowerCase().replace(/[\s-]+/g, '_');
        const mapPm: 'cash' | 'bank_transfer' | 'card' | 'other' =
          pmLower === 'cash'
            ? 'cash'
            : pmLower === 'card'
            ? 'card'
            : pmLower === 'bank_transfer'
            ? 'bank_transfer'
            : 'other';

        inv.payments.push({
          amount: allocated,
          date: new Date(),
          paymentMethod: mapPm,
        });
        if (CurrencyPrecision.round(totalPaid + allocated) >= inv.amount) {
          inv.status = 'paid';
        }
        await inv.save();
        allocations.push({
          invoice_id: inv.invoiceNumber || inv._id.toString(),
          allocated_amount: allocated,
          remaining_invoice_balance: CurrencyPrecision.round(Math.max(0, due - allocated)),
        });
        remainingAmount = CurrencyPrecision.round(remainingAmount - allocated);
      }
    }

    // Record Income Transaction in Finance module
    try {
      const txPm =
        paymentMethod === 'Cash'
          ? 'cash'
          : paymentMethod === 'Card'
          ? 'card'
          : 'bank_transfer';

      await TransactionModel.create({
        companyId:
          companyId && Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : undefined,
        type: 'income',
        category: 'Receipt Payment Inflow',
        amount: amount,
        date: date ? new Date(date) : new Date(),
        paymentMethod: txPm,
        status: status === 'Cancelled' ? 'cancelled' : 'completed',
        reference: reference,
        description: `Payment receipt voucher from ${customerName}`,
      });
    } catch (txErr) {
      console.warn('Could not record background income transaction for receipt:', txErr);
    }

    // Update Customer Total Spent
    if (customerId && Types.ObjectId.isValid(customerId)) {
      await CustomerModel.findByIdAndUpdate(customerId, {
        $inc: { total_spent: amount },
      }).exec();
    } else if (customerName) {
      const escapedName = customerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const customer = await CustomerModel.findOne({
        name: { $regex: `^${escapedName}$`, $options: 'i' },
      }).exec();
      if (customer) {
        customer.total_spent = (customer.total_spent || 0) + amount;
        await customer.save();
      }
    }

    const validInvoiceObjectId =
      invoiceId && Types.ObjectId.isValid(invoiceId)
        ? new Types.ObjectId(invoiceId)
        : undefined;

    const validCustomerObjectId =
      customerId && Types.ObjectId.isValid(customerId)
        ? new Types.ObjectId(customerId)
        : undefined;

    const receipt = await this.receiptRepository.create({
      companyId:
        companyId && Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : undefined,
      invoiceId: validInvoiceObjectId,
      customerId: validCustomerObjectId,
      reference,
      customerName,
      paymentMethod,
      amount,
      currency,
      date,
      bank_account,
      transaction_reference,
      notes,
      received_by: finalReceivedBy,
      status,
      allocations,
      unallocated_amount: remainingAmount,
    });

    return receipt;
  }

  async updateReceipt(id: string, data: Partial<CreateReceiptDTO>): Promise<IReceipt> {
    const existing = await this.getReceiptById(id);

    const updatePayload: Partial<IReceipt> = {};
    if (data.customerName || data.customer_name) {
      updatePayload.customerName = (data.customerName || data.customer_name)!.trim();
    }
    if (data.paymentMethod || data.payment_method) {
      updatePayload.paymentMethod = normalizePaymentMethod(data.paymentMethod || data.payment_method);
    }
    if (data.amount !== undefined) {
      updatePayload.amount = CurrencyPrecision.round(Number(data.amount) || 0);
    }
    if (data.status) updatePayload.status = data.status;
    if (data.notes !== undefined) updatePayload.notes = data.notes;
    if (data.bank_account || data.bankAccount) {
      updatePayload.bank_account = data.bank_account || data.bankAccount;
    }
    if (data.transaction_reference || data.transactionReference) {
      updatePayload.transaction_reference = data.transaction_reference || data.transactionReference;
    }

    const updated = await this.receiptRepository.update(id, updatePayload);
    if (!updated) {
      throw AppError.notFound('Receipt voucher not found');
    }

    if (data.status && data.status !== existing.status) {
      await TransactionModel.findOneAndUpdate(
        { reference: existing.reference },
        { status: data.status === 'Cancelled' ? 'cancelled' : 'completed' },
      ).exec();
    }

    return updated;
  }

  async cancelReceipt(id: string): Promise<void> {
    const existing = await this.getReceiptById(id);
    existing.status = 'Cancelled';
    await existing.save();

    await TransactionModel.findOneAndUpdate(
      { reference: existing.reference },
      { status: 'cancelled' },
    ).exec();
  }

  async generatePdf(id: string): Promise<{ buffer: Buffer; filename: string }> {
    const receipt = await this.getReceiptById(id);
    const filename = `Receipt_${receipt.reference || receipt._id}.pdf`;

    const buffer = PdfGenerator.generateReceiptPdf({
      reference: receipt.reference,
      invoiceId: receipt.invoiceId?.toString(),
      customerName: receipt.customerName,
      paymentMethod: receipt.paymentMethod,
      amount: receipt.amount,
      currency: receipt.currency || 'AED',
      date: receipt.date,
      bank_account: receipt.bank_account,
      transaction_reference: receipt.transaction_reference,
      received_by: receipt.received_by,
      notes: receipt.notes,
    });

    return { buffer, filename };
  }
}

