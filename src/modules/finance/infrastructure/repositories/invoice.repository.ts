import { Types } from 'mongoose';
import { InvoiceModel, IInvoice } from '../models/Invoice.model';

export interface InvoiceFilters {
  status?: string;
  lead_owner?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export class InvoiceRepository {
  async findFiltered(
    companyId?: string,
    filters: InvoiceFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 },
  ): Promise<{
    invoices: IInvoice[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const query: any = {};

    if (companyId && Types.ObjectId.isValid(companyId)) {
      // Strict workspace scoping - only return invoices for this company
      query.companyId = new Types.ObjectId(companyId);
    }

    if (filters.status && filters.status !== 'all') {
      query.status = { $regex: new RegExp(`^${filters.status.trim()}$`, 'i') };
    }

    if (filters.lead_owner && filters.lead_owner !== 'all') {
      const lead = filters.lead_owner.trim();
      query.$or = [
        { lead_by: { $regex: lead, $options: 'i' } },
        { lead_owner: { $regex: lead, $options: 'i' } },
      ];
    }

    if (filters.start_date || filters.end_date) {
      query.issue_date = {};
      if (filters.start_date) query.issue_date.$gte = filters.start_date;
      if (filters.end_date) query.issue_date.$lte = filters.end_date;
    }

    if (filters.search && filters.search.trim()) {
      const s = filters.search.trim();
      const searchRegex = { $regex: s, $options: 'i' };
      const searchConditions: any[] = [
        { invoice_number: searchRegex },
        { custom_id: searchRegex },
        { customer_name: searchRegex },
        { contact_name: searchRegex },
        { care_of: searchRegex },
        { category: searchRegex },
        { service: searchRegex },
        { lead_by: searchRegex },
        { lead_owner: searchRegex },
        { 'items.description': searchRegex },
        { 'items.name': searchRegex },
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const page = Math.max(1, pagination.page || 1);
    const limit = Math.max(1, Math.min(100, pagination.limit || 20));
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      InvoiceModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      InvoiceModel.countDocuments(query).exec(),
    ]);

    const total_pages = Math.ceil(total / limit) || 1;

    return {
      invoices,
      total,
      page,
      limit,
      total_pages,
    };
  }

  async findById(id: string, _companyId?: string): Promise<IInvoice | null> {
    if (!id) return null;

    // 1. Direct custom_id or invoice_number match
    let invoice = await InvoiceModel.findOne({
      $or: [{ custom_id: id }, { invoice_number: id }],
    }).exec();

    if (invoice) return invoice;

    // 2. If valid MongoDB ObjectId
    if (Types.ObjectId.isValid(id)) {
      invoice = await InvoiceModel.findById(id).exec();
    }

    return invoice;
  }

  async create(data: Partial<IInvoice>): Promise<IInvoice> {
    const invoice = new InvoiceModel(data);
    return invoice.save();
  }

  async update(id: string, data: Partial<IInvoice>): Promise<IInvoice | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    Object.assign(existing, data);
    return existing.save();
  }

  async delete(id: string): Promise<IInvoice | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    return InvoiceModel.findByIdAndDelete(existing._id).exec();
  }

  async count(companyId?: string): Promise<number> {
    const query: any = {};
    if (companyId && Types.ObjectId.isValid(companyId)) {
      query.companyId = new Types.ObjectId(companyId);
    }
    return InvoiceModel.countDocuments(query).exec();
  }
}
