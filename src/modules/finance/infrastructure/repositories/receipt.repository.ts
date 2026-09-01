import { Types } from 'mongoose';
import { ReceiptModel, IReceipt } from '../models/Receipt.model';

export interface ReceiptFilters {
  payment_method?: string;
  status?: string;
  customer_id?: string;
  invoice_id?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export class ReceiptRepository {
  async findFiltered(
    companyId?: string,
    filters: ReceiptFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 },
  ): Promise<{ receipts: IReceipt[]; total: number; page: number; limit: number }> {
    const query: any = {};

    if (companyId && Types.ObjectId.isValid(companyId)) {
      query.$or = [{ companyId: new Types.ObjectId(companyId) }, { companyId: null }];
    }

    if (filters.payment_method && filters.payment_method !== 'all') {
      query.paymentMethod = filters.payment_method;
    }

    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    if (filters.customer_id && Types.ObjectId.isValid(filters.customer_id)) {
      query.customerId = new Types.ObjectId(filters.customer_id);
    }

    if (filters.invoice_id) {
      if (Types.ObjectId.isValid(filters.invoice_id)) {
        query.invoiceId = new Types.ObjectId(filters.invoice_id);
      }
    }

    if (filters.start_date || filters.end_date) {
      query.createdAt = {};
      if (filters.start_date) query.createdAt.$gte = new Date(filters.start_date);
      if (filters.end_date) {
        const end = new Date(filters.end_date);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (filters.search && filters.search.trim()) {
      const s = filters.search.trim();
      query.$or = [
        { reference: { $regex: s, $options: 'i' } },
        { customerName: { $regex: s, $options: 'i' } },
        { transaction_reference: { $regex: s, $options: 'i' } },
        { notes: { $regex: s, $options: 'i' } },
      ];
    }

    const page = Math.max(1, pagination.page || 1);
    const limit = Math.max(1, Math.min(100, pagination.limit || 20));
    const skip = (page - 1) * limit;

    const [receipts, total] = await Promise.all([
      ReceiptModel.find(query).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit).exec(),
      ReceiptModel.countDocuments(query).exec(),
    ]);

    return { receipts, total, page, limit };
  }

  async findById(id: string): Promise<IReceipt | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return ReceiptModel.findById(id).exec();
  }

  async findByReference(reference: string): Promise<IReceipt | null> {
    return ReceiptModel.findOne({ reference }).exec();
  }

  async create(data: Partial<IReceipt>): Promise<IReceipt> {
    const receipt = new ReceiptModel(data);
    return receipt.save();
  }

  async update(id: string, data: Partial<IReceipt>): Promise<IReceipt | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return ReceiptModel.findByIdAndUpdate(id, data, { returnDocument: 'after' }).exec();
  }

  async delete(id: string): Promise<IReceipt | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return ReceiptModel.findByIdAndDelete(id).exec();
  }
}
