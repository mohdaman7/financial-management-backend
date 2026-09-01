import { Types } from 'mongoose';
import {
  CustomerRepository,
  CustomerFilters,
  PaginationOptions,
} from '../../infrastructure/repositories/customer.repository';
import {
  ICustomer,
  ICustomerDocument,
  ICustomerActivityLog,
} from '../../infrastructure/models/Customer.model';
import { AppError } from '@shared/errors/AppError';
import { getGridFSBucket } from '@shared/middleware/gridfs.middleware';

export interface CreateCustomerDTO {
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  passport_number?: string;
  passport_expiry?: string;
  nationality?: string;
  country?: string;
  company_name?: string;
  assigned_employee_id?: string;
  assigned_agent?: string;
  lead_source?: string;
  status?: string;
  priority?: string;
  current_service?: string;
  tags?: string[];
  notes?: string;
  internal_notes?: string;
  created_by?: string;
}

export class CustomerService {
  constructor(private customerRepository: CustomerRepository) {}

  async listCustomers(
    companyId?: string,
    filters: CustomerFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 },
  ): Promise<{ customers: ICustomer[]; meta: { total: number; page: number; limit: number } }> {
    const { customers, total, page, limit } = await this.customerRepository.findFiltered(
      companyId,
      filters,
      pagination,
    );
    return {
      customers,
      meta: { total, page, limit },
    };
  }

  async getCustomerById(id: string): Promise<ICustomer> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw AppError.notFound('Customer not found');
    }
    return customer;
  }

  async createCustomer(
    companyId: string | undefined,
    data: CreateCustomerDTO,
    performedBy = 'System',
  ): Promise<ICustomer> {
    const customerPayload: Partial<ICustomer> = {
      ...data,
      companyId:
        companyId && Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : undefined,
      assigned_employee_id:
        data.assigned_employee_id && Types.ObjectId.isValid(data.assigned_employee_id)
          ? new Types.ObjectId(data.assigned_employee_id)
          : undefined,
      status: data.status || 'lead',
      priority: data.priority || 'normal',
      tags: Array.isArray(data.tags) ? data.tags : [],
      total_spent: 0,
      documents: [],
      activity_log: [
        {
          action: 'PROFILE_CREATED',
          description: `Customer profile created with initial status "${data.status || 'lead'}"`,
          performed_by: performedBy,
          timestamp: new Date(),
        },
      ],
    };

    return this.customerRepository.create(customerPayload);
  }

  async updateCustomer(
    id: string,
    data: Partial<CreateCustomerDTO>,
    performedBy = 'System',
  ): Promise<ICustomer> {
    const existing = await this.getCustomerById(id);

    const updatePayload: any = { ...data };
    if (data.assigned_employee_id) {
      if (Types.ObjectId.isValid(data.assigned_employee_id)) {
        updatePayload.assigned_employee_id = new Types.ObjectId(data.assigned_employee_id);
      }
    }

    const updated = await this.customerRepository.update(id, updatePayload);
    if (!updated) {
      throw AppError.notFound('Customer not found');
    }

    // Check if status changed
    if (data.status && data.status !== existing.status) {
      await this.customerRepository.addActivityLog(id, {
        action: 'STATUS_CHANGED',
        description: `Customer status changed from "${existing.status}" to "${data.status}"`,
        performed_by: performedBy,
        timestamp: new Date(),
      });
    } else {
      await this.customerRepository.addActivityLog(id, {
        action: 'PROFILE_UPDATED',
        description: 'Customer profile details updated',
        performed_by: performedBy,
        timestamp: new Date(),
      });
    }

    return this.getCustomerById(id);
  }

  async deleteCustomer(id: string): Promise<void> {
    const existing = await this.customerRepository.findById(id);
    if (!existing) {
      throw AppError.notFound('Customer not found');
    }
    await this.customerRepository.delete(id);
  }

  async listDocuments(customerId: string): Promise<ICustomerDocument[]> {
    const customer = await this.getCustomerById(customerId);
    return customer.documents || [];
  }

  async addDocument(
    customerId: string,
    document: {
      name: string;
      type: string;
      file_url: string;
      fileId?: string;
      size_bytes?: number;
      status?: string;
    },
    performedBy = 'System',
  ): Promise<ICustomerDocument> {
    await this.getCustomerById(customerId);

    const docObj: ICustomerDocument = {
      name: document.name,
      type: document.type || 'Other',
      file_url: document.file_url,
      fileId: document.fileId ? new Types.ObjectId(document.fileId) : undefined,
      size_bytes: document.size_bytes || 0,
      status: document.status || 'pending',
      uploaded_at: new Date(),
    };

    const updated = await this.customerRepository.addDocument(customerId, docObj);
    if (!updated) {
      throw AppError.notFound('Customer not found');
    }

    await this.customerRepository.addActivityLog(customerId, {
      action: 'DOCUMENT_UPLOADED',
      description: `Uploaded ${document.name} (${document.type || 'Document'})`,
      performed_by: performedBy,
      timestamp: new Date(),
    });

    const newDoc = updated.documents[updated.documents.length - 1];
    return newDoc;
  }

  async deleteDocument(
    customerId: string,
    documentId: string,
    performedBy = 'System',
  ): Promise<void> {
    const customer = await this.getCustomerById(customerId);
    const docToDelete = customer.documents.find(
      (d: any) => d._id?.toString() === documentId || d.id === documentId,
    );

    if (!docToDelete) {
      throw AppError.notFound('Document not found in customer vault');
    }

    // If GridFS file exists, attempt deletion
    if (docToDelete.fileId) {
      try {
        const bucket = getGridFSBucket();
        await bucket.delete(new Types.ObjectId(docToDelete.fileId.toString()));
      } catch (err) {
        // Silently continue if already deleted
      }
    }

    await this.customerRepository.removeDocument(customerId, documentId);

    await this.customerRepository.addActivityLog(customerId, {
      action: 'DOCUMENT_DELETED',
      description: `Deleted ${docToDelete.name} from vault`,
      performed_by: performedBy,
      timestamp: new Date(),
    });
  }

  async getActivityLog(customerId: string): Promise<ICustomerActivityLog[]> {
    const customer = await this.getCustomerById(customerId);
    const logs = customer.activity_log || [];
    return [...logs].reverse();
  }
}
