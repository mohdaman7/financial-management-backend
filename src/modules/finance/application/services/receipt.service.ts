import { Types } from 'mongoose';
import {
  ReceiptRepository,
  ReceiptFilters,
  PaginationOptions,
} from '../../infrastructure/repositories/receipt.repository';
import { IReceipt, IReceiptAllocation } from '../../infrastructure/models/Receipt.model';
import { TransactionModel } from '../../infrastructure/models/Transaction.model';
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
  ): Promise<{ receipts: any[]; meta: { total: number; page: number; limit: number } }> {
    const { receipts, total, page, limit } = await this.receiptRepository.findFiltered(
      companyId,
      filters,
      pagination,
    );

    const formatted = receipts.map((rec) => {
      const recObj = rec.toObject ? rec.toObject() : rec;
      const allocatedTotal = CurrencyPrecision.round(
        (recObj.allocations || []).reduce(
          (acc: number, a: any) => acc + (a.allocated_amount || 0),
          0,
        ),
      );
      const applied =
        allocatedTotal > 0
          ? allocatedTotal
          : recObj.unallocated_amount !== undefined
          ? CurrencyPrecision.round(Math.max(0, recObj.amount - recObj.unallocated_amount))
          : recObj.amount;
      const advance =
        recObj.unallocated_amount !== undefined
          ? recObj.unallocated_amount
          : CurrencyPrecision.round(Math.max(0, recObj.amount - applied));

      return {
        ...recObj,
        id: recObj.reference || recObj._id?.toString(),
        customer_id: recObj.customerId ? recObj.customerId.toString() : '',
        customer_name: recObj.customerName || '',
        invoice_id: recObj.invoiceId ? recObj.invoiceId.toString() : '-',
        payment_method: recObj.paymentMethod,
        reference_number: recObj.reference,
        applied,
        advance,
      };
    });

    return { receipts: formatted, meta: { total, page, limit } };
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
      const stdInv = Types.ObjectId.isValid(invoiceId)
        ? await InvoiceModel.findById(invoiceId).exec()
        : await InvoiceModel.findOne({
            $or: [{ invoice_number: invoiceId }, { custom_id: invoiceId }],
          }).exec();

      if (stdInv) {
        customerName = stdInv.customer_name;
        if (stdInv.customer_id) customerId = stdInv.customer_id.toString();
      }
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
      const stdInvoice = Types.ObjectId.isValid(invoiceId)
        ? await InvoiceModel.findById(invoiceId).exec()
        : await InvoiceModel.findOne({
            $or: [{ invoice_number: invoiceId }, { custom_id: invoiceId }],
          }).exec();

      if (stdInvoice) {
        const grandTotal = CurrencyPrecision.round(stdInvoice.grand_total || 0);
        const currentPaid = CurrencyPrecision.round(stdInvoice.paid_amount || 0);
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
          invoice_id: stdInvoice.invoice_number || stdInvoice.custom_id || stdInvoice._id.toString(),
          allocated_amount: allocated,
          remaining_invoice_balance: newBalance,
        });

        remainingAmount = CurrencyPrecision.round(remainingAmount - allocated);
      }
    }

    // 2. FIFO multi-invoice allocation across unpaid customer invoices if remainingAmount > 0
    if (remainingAmount > 0 && (customerId || customerName)) {
      const stdQuery: any = {
        status: { $nin: ['Paid', 'Cancelled', 'Void', 'paid', 'cancelled', 'void'] },
      };
      if (companyId && Types.ObjectId.isValid(companyId)) {
        stdQuery.companyId = new Types.ObjectId(companyId);
      }
      if (customerId && Types.ObjectId.isValid(customerId)) {
        stdQuery.customer_id = new Types.ObjectId(customerId);
      } else if (customerName) {
        const escaped = customerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        stdQuery.customer_name = { $regex: `^${escaped}$`, $options: 'i' };
      }

      const unpaidStandard = await InvoiceModel.find(stdQuery).sort({ issue_date: 1, createdAt: 1 }).exec();

      interface CombinedInv {
        type: 'standard';
        doc: any;
        createdAt: Date;
      }

      const combined: CombinedInv[] = unpaidStandard.map((doc) => ({
        type: 'standard' as const,
        doc,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
      })).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      // Deduplicate by invoice number so dual-seeded test fixtures don't double allocate
      const seenInvoiceNumbers = new Set<string>();
      if (invoiceId) {
        seenInvoiceNumbers.add(invoiceId.toLowerCase());
      }
      for (const alloc of allocations) {
        if (alloc.invoice_id) seenInvoiceNumbers.add(alloc.invoice_id.toLowerCase());
      }

      const deduplicated: CombinedInv[] = [];
      for (const item of combined) {
        const rawNum = item.doc.invoice_number;
        const num = (rawNum || item.doc._id.toString()).trim().toLowerCase();
        if (seenInvoiceNumbers.has(num)) continue;
        seenInvoiceNumbers.add(num);
        deduplicated.push(item);
      }

      for (const item of deduplicated) {
        if (remainingAmount <= 0) break;

        if (item.type === 'standard') {
          const stdInv = item.doc;
          if (
            invoiceId &&
            (stdInv._id.toString() === invoiceId || stdInv.invoice_number === invoiceId)
          ) {
            continue;
          }

          const grandTotal = CurrencyPrecision.round(stdInv.grand_total || 0);
          const currentPaid = CurrencyPrecision.round(stdInv.paid_amount || 0);
          const due = CurrencyPrecision.round(Math.max(0, grandTotal - currentPaid));
          if (due <= 0) continue;

          const allocated = CurrencyPrecision.round(Math.min(due, remainingAmount));
          const newPaid = CurrencyPrecision.round(currentPaid + allocated);
          const newBalance = CurrencyPrecision.round(Math.max(0, grandTotal - newPaid));

          stdInv.paid_amount = newPaid;
          stdInv.balance_amount = newBalance;
          stdInv.status = newBalance <= 0 ? 'Paid' : 'Partially Paid';
          await stdInv.save();

          allocations.push({
            invoice_id: stdInv.invoice_number || stdInv.custom_id || stdInv._id.toString(),
            allocated_amount: allocated,
            remaining_invoice_balance: newBalance,
          });

          remainingAmount = CurrencyPrecision.round(remainingAmount - allocated);
        }
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
      if (data.status === 'Cancelled') {
        await this.cancelReceipt(id);
      } else {
        await TransactionModel.findOneAndUpdate(
          { reference: existing.reference },
          { status: 'completed' },
        ).exec();
      }
    }

    return updated;
  }

  async cancelReceipt(id: string): Promise<void> {
    const existing = await this.getReceiptById(id);
    if (existing.status === 'Cancelled') return;

    // 1. Reverse allocations on invoices
    if (existing.allocations && Array.isArray(existing.allocations)) {
      for (const alloc of existing.allocations) {
        if (!alloc.allocated_amount || alloc.allocated_amount <= 0) continue;

        const inv = Types.ObjectId.isValid(alloc.invoice_id)
          ? await InvoiceModel.findById(alloc.invoice_id).exec()
          : await InvoiceModel.findOne({ invoice_number: alloc.invoice_id }).exec();

        if (inv) {
          const grandTotal = CurrencyPrecision.round(inv.grand_total || 0);
          const newPaid = CurrencyPrecision.round(
            Math.max(0, (inv.paid_amount || 0) - alloc.allocated_amount),
          );
          const newBalance = CurrencyPrecision.round(Math.max(0, grandTotal - newPaid));

          let status: 'Paid' | 'Partially Paid' | 'Pending' = 'Pending';
          if (newBalance <= 0 && grandTotal > 0) {
            status = 'Paid';
          } else if (newPaid > 0) {
            status = 'Partially Paid';
          }

          inv.paid_amount = newPaid;
          inv.balance_amount = newBalance;
          inv.status = status;
          await inv.save();
        }
      }
    }

    // 2. Decrement Customer total_spent
    if (existing.customerId && Types.ObjectId.isValid(existing.customerId.toString())) {
      await CustomerModel.findByIdAndUpdate(existing.customerId, {
        $inc: { total_spent: -existing.amount },
      }).exec();
    } else if (existing.customerName) {
      const escapedName = existing.customerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const customer = await CustomerModel.findOne({
        name: { $regex: `^${escapedName}$`, $options: 'i' },
      }).exec();
      if (customer) {
        customer.total_spent = Math.max(0, (customer.total_spent || 0) - existing.amount);
        await customer.save();
      }
    }

    // 3. Mark Receipt as Cancelled and clear allocations
    existing.status = 'Cancelled';
    existing.unallocated_amount = 0;
    existing.allocations = [];
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
