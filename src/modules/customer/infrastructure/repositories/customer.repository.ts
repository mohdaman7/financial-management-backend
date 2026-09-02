import { Types } from 'mongoose';
import {
  CustomerModel,
  ICustomer,
  ICustomerDocument,
  ICustomerActivityLog,
} from '../models/Customer.model';

export interface CustomerFilters {
  status?: string;
  priority?: string;
  lead_source?: string;
  assigned_employee_id?: string;
  search?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export class CustomerRepository {
  async findFiltered(
    companyId?: string,
    filters: CustomerFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 },
  ): Promise<{ customers: ICustomer[]; total: number; page: number; limit: number }> {
    const query: any = {};

    if (
      companyId &&
      companyId !== '000000000000000000000000' &&
      companyId !== 'all' &&
      Types.ObjectId.isValid(companyId)
    ) {
      query.$or = [
        { companyId: new Types.ObjectId(companyId) },
        { companyId: null },
        { companyId: { $exists: false } },
      ];
    }

    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    if (filters.priority && filters.priority !== 'all') {
      query.priority = filters.priority;
    }

    if (filters.lead_source && filters.lead_source !== 'all') {
      query.lead_source = filters.lead_source;
    }

    if (filters.assigned_employee_id) {
      query.assigned_employee_id = new Types.ObjectId(filters.assigned_employee_id);
    }

    if (filters.search && filters.search.trim()) {
      const s = filters.search.trim();
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { phone: { $regex: s, $options: 'i' } },
        { company_name: { $regex: s, $options: 'i' } },
        { passport_number: { $regex: s, $options: 'i' } },
      ];
    }

    const page = Math.max(1, pagination.page || 1);
    const limit = Math.max(1, Math.min(100, pagination.limit || 20));
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      CustomerModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      CustomerModel.countDocuments(query).exec(),
    ]);

    return { customers, total, page, limit };
  }

  async findById(id: string, companyId?: string): Promise<ICustomer | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const query: any = { _id: new Types.ObjectId(id) };
    if (
      companyId &&
      companyId !== '000000000000000000000000' &&
      companyId !== 'all' &&
      Types.ObjectId.isValid(companyId)
    ) {
      query.$or = [
        { companyId: new Types.ObjectId(companyId) },
        { companyId: null },
        { companyId: { $exists: false } },
      ];
    }
    return CustomerModel.findOne(query).exec();
  }

  async findByEmail(companyId: string, email: string): Promise<ICustomer | null> {
    if (!email) return null;
    const query: any = { email: email.toLowerCase().trim() };
    if (
      companyId &&
      companyId !== '000000000000000000000000' &&
      companyId !== 'all' &&
      Types.ObjectId.isValid(companyId)
    ) {
      query.$or = [
        { companyId: new Types.ObjectId(companyId) },
        { companyId: null },
        { companyId: { $exists: false } },
      ];
    }
    return CustomerModel.findOne(query).exec();
  }

  async create(data: Partial<ICustomer>): Promise<ICustomer> {
    const customer = new CustomerModel(data);
    return customer.save();
  }

  async update(id: string, data: Partial<ICustomer>): Promise<ICustomer | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return CustomerModel.findByIdAndUpdate(id, data, { returnDocument: 'after' }).exec();
  }

  async delete(id: string): Promise<ICustomer | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return CustomerModel.findByIdAndDelete(id).exec();
  }

  async addDocument(customerId: string, document: ICustomerDocument): Promise<ICustomer | null> {
    if (!Types.ObjectId.isValid(customerId)) return null;
    return CustomerModel.findByIdAndUpdate(
      customerId,
      { $push: { documents: document } },
      { returnDocument: 'after' },
    ).exec();
  }

  async removeDocument(customerId: string, documentId: string): Promise<ICustomer | null> {
    if (!Types.ObjectId.isValid(customerId)) return null;
    return CustomerModel.findByIdAndUpdate(
      customerId,
      {
        $pull: {
          documents: {
            $or: [{ _id: new Types.ObjectId(documentId) }, { id: documentId }],
          },
        },
      },
      { returnDocument: 'after' },
    ).exec();
  }

  async addActivityLog(
    customerId: string,
    activity: ICustomerActivityLog,
  ): Promise<ICustomer | null> {
    if (!Types.ObjectId.isValid(customerId)) return null;
    return CustomerModel.findByIdAndUpdate(
      customerId,
      { $push: { activity_log: activity } },
      { returnDocument: 'after' },
    ).exec();
  }
}
