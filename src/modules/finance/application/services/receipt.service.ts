import { Types } from 'mongoose';
import {
  ReceiptRepository,
  ReceiptFilters,
  PaginationOptions,
} from '../../infrastructure/repositories/receipt.repository';
import { IReceipt, IReceiptAllocation } from '../../infrastructure/models/Receipt.model';
import { TransactionModel } from '../../infrastructure/models/Transaction.model';
import { TravelInvoiceModel } from '../../../travel/infrastructure/models/TravelInvoice.model';
import { CustomerModel } from '../../../customer/infrastructure/models/Customer.model';
import { AppError } from '@shared/errors/AppError';
import { PdfGenerator } from '@shared/utils/pdfGenerator';
import { CurrencyPrecision } from '@shared/utils/currencyPrecision';

export interface CreateReceiptDTO {
  invoiceId?: string;
  customerId?: string;
  customerName: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Card' | 'Online Payment' | 'Cheque' | string;
  amount: number;
  currency?: string;
  date?: string;
  reference?: string;
  bank_account?: string;
  transaction_reference?: string;
  notes?: string;
  received_by?: string;
  status?: 'Received' | 'Pending' | 'Cancelled' | string;
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
    let reference = data.reference;
    if (!reference) {
      const count = await this.receiptRepository.findFiltered(companyId);
      reference = `REC-${String(count.total + 1).padStart(4, '0')}`;
    }

    const allocations: IReceiptAllocation[] = [];
    let remainingAmount = CurrencyPrecision.round(data.amount);

    // 1. Single Specific Invoice Allocation
    if (data.invoiceId) {
      const invoice = await TravelInvoiceModel.findById(data.invoiceId).exec();
      if (invoice) {
        const totalPaid = CurrencyPrecision.round(
          (invoice.payments || []).reduce((acc, p) => acc + (p.amount || 0), 0),
        );
        const due = CurrencyPrecision.round(Math.max(0, invoice.amount - totalPaid));
        const allocated = CurrencyPrecision.round(Math.min(due, remainingAmount));

        invoice.payments.push({
          amount: allocated,
          date: new Date(),
          paymentMethod:
            (data.paymentMethod.toLowerCase().replace(' ', '_') as any) || 'bank_transfer',
        });

        if (CurrencyPrecision.round(totalPaid + allocated) >= invoice.amount) {
          invoice.status = 'paid';
        }

        await invoice.save();

        allocations.push({
          invoice_id: invoice.invoiceNumber || invoice._id.toString(),
          allocated_amount: allocated,
          remaining_invoice_balance: CurrencyPrecision.round(Math.max(0, due - allocated)),
        });

        remainingAmount = CurrencyPrecision.round(remainingAmount - allocated);
      }
    } else if (data.customerId || data.customerName) {
      // 2. FIFO multi-invoice allocation for customer debts (oldest unpaid invoice first)
      const query: any = { status: { $ne: 'paid' } };
      if (companyId && Types.ObjectId.isValid(companyId)) {
        query.companyId = new Types.ObjectId(companyId);
      }
      if (data.customerId && Types.ObjectId.isValid(data.customerId)) {
        query.customerId = new Types.ObjectId(data.customerId);
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
        inv.payments.push({
          amount: allocated,
          date: new Date(),
          paymentMethod:
            (data.paymentMethod.toLowerCase().replace(' ', '_') as any) || 'bank_transfer',
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
    await TransactionModel.create({
      companyId:
        companyId && Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : undefined,
      type: 'income',
      category: 'Receipt Payment Inflow',
      amount: data.amount,
      date: data.date ? new Date(data.date) : new Date(),
      paymentMethod:
        data.paymentMethod === 'Cash'
          ? 'cash'
          : data.paymentMethod === 'Card'
            ? 'card'
            : 'bank_transfer',
      status: data.status === 'Cancelled' ? 'cancelled' : 'completed',
      reference: reference,
      description: `Payment receipt voucher from ${data.customerName}`,
    });

    // Update Customer Total Spent
    if (data.customerId && Types.ObjectId.isValid(data.customerId)) {
      await CustomerModel.findByIdAndUpdate(data.customerId, {
        $inc: { total_spent: data.amount },
      }).exec();
    } else {
      const customer = await CustomerModel.findOne({
        name: { $regex: `^${data.customerName.trim()}$`, $options: 'i' },
      }).exec();
      if (customer) {
        customer.total_spent = (customer.total_spent || 0) + data.amount;
        await customer.save();
      }
    }

    const receipt = await this.receiptRepository.create({
      companyId:
        companyId && Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : undefined,
      invoiceId:
        data.invoiceId && Types.ObjectId.isValid(data.invoiceId)
          ? new Types.ObjectId(data.invoiceId)
          : undefined,
      customerId:
        data.customerId && Types.ObjectId.isValid(data.customerId)
          ? new Types.ObjectId(data.customerId)
          : undefined,
      reference,
      customerName: data.customerName,
      paymentMethod: data.paymentMethod,
      amount: data.amount,
      currency: data.currency || 'AED',
      date: data.date || new Date().toISOString().split('T')[0],
      bank_account: data.bank_account || 'Main Bank Account',
      transaction_reference: data.transaction_reference || '',
      notes: data.notes || '',
      received_by: data.received_by || receivedBy,
      status: data.status || 'Received',
      allocations,
      unallocated_amount: remainingAmount,
    });

    return receipt;
  }

  async updateReceipt(id: string, data: Partial<CreateReceiptDTO>): Promise<IReceipt> {
    const existing = await this.getReceiptById(id);

    const updated = await this.receiptRepository.update(id, data);
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
