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
import { InvoiceModel } from '@modules/finance/infrastructure/models/Invoice.model';
import { TravelInvoiceModel } from '@modules/travel/infrastructure/models/TravelInvoice.model';
import { ReceiptModel } from '@modules/finance/infrastructure/models/Receipt.model';
import { AppError } from '@shared/errors/AppError';
import { getGridFSBucket } from '@shared/middleware/gridfs.middleware';
import { CurrencyPrecision } from '@shared/utils/currencyPrecision';
import {
  CustomerLedgerQueryDTO,
  AllocateCreditDTO,
} from '../../presentation/validators/customer.validator';

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
  companyId?: string;
  company_id?: string;
  assigned_employee_id?: string;
  assigned_agent?: string;
  assignedEmployee?: string;
  assigned_agent_id?: string;
  lead_source?: string;
  status?: string;
  priority?: string;
  current_service?: string;
  tags?: string[];
  notes?: string;
  internal_notes?: string;
  opening_balance?: number;
  created_by?: string;
  address?: string;
  passportDetails?: {
    passportNumber?: string;
    expiryDate?: Date;
  };
}

export interface CustomerFinancialSummaryResult {
  customerId: string;
  customerName: string;
  currency: string;
  totalBilledDebit: number;
  totalReceivedCredit: number;
  outstandingDues: number;
  remainingAdvanceCredit: number;
  accountStatus: 'SETTLED_AND_CREDIT_AVAILABLE' | 'DUE_OUTSTANDING' | 'SETTLED';
  metricsCount: {
    totalInvoices: number;
    totalReceipts: number;
  };
  lastTransactionDate: string | null;
}

export interface CustomerLedgerItem {
  id: string;
  date: string;
  refNo: string;
  type: 'invoice' | 'receipt';
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  status: string;
}

export interface CustomerLedgerResult {
  data: CustomerLedgerItem[];
  summary: {
    openingBalance: number;
    totalDebit: number;
    totalCredit: number;
    closingBalance: number;
  };
  pagination: {
    page: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
  };
}

export interface AllocateCreditResult {
  allocationId: string;
  invoiceId: string;
  allocatedAmount: number;
  invoiceRemainingDue: number;
  customerRemainingAdvanceCredit: number;
  status: string;
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

  async getCustomerById(id: string, companyId?: string): Promise<ICustomer> {
    const customer = await this.customerRepository.findById(id, companyId);
    if (!customer) {
      throw AppError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
    }
    return customer;
  }

  async createCustomer(
    companyId: string | undefined,
    data: CreateCustomerDTO,
    performedBy = 'System',
  ): Promise<ICustomer> {
    const rawCompanyId = companyId || data.companyId || data.company_id;
    const effectiveCompanyId =
      rawCompanyId &&
      rawCompanyId !== '000000000000000000000000' &&
      rawCompanyId !== 'all' &&
      Types.ObjectId.isValid(rawCompanyId)
        ? new Types.ObjectId(rawCompanyId)
        : undefined;

    const rawEmpId =
      data.assigned_employee_id || data.assignedEmployee || data.assigned_agent_id;
    const assignedEmployeeId =
      rawEmpId && Types.ObjectId.isValid(rawEmpId) ? new Types.ObjectId(rawEmpId) : undefined;

    const { assignedEmployee, ...restData } = data;
    const customerPayload: Partial<ICustomer> = {
      ...restData,
      companyId: effectiveCompanyId,
      assigned_employee_id: assignedEmployeeId,
      assignedEmployee: assignedEmployeeId,
      status: data.status || 'lead',
      priority: data.priority || 'normal',
      tags: Array.isArray(data.tags) ? data.tags : [],
      total_spent: 0,
      opening_balance: Number(data.opening_balance) || 0,
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
    companyId?: string,
  ): Promise<ICustomer> {
    const existing = await this.getCustomerById(id, companyId);

    const { assignedEmployee, ...restData } = data;
    const updatePayload: any = { ...restData };
    const empId =
      data.assigned_employee_id || data.assignedEmployee || data.assigned_agent_id;
    if (empId && Types.ObjectId.isValid(empId)) {
      updatePayload.assigned_employee_id = new Types.ObjectId(empId);
      updatePayload.assignedEmployee = new Types.ObjectId(empId);
    }

    const updated = await this.customerRepository.update(id, updatePayload);
    if (!updated) {
      throw AppError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
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

    return this.getCustomerById(id, companyId);
  }

  async deleteCustomer(id: string, companyId?: string): Promise<void> {
    const existing = await this.getCustomerById(id, companyId);
    if (!existing) {
      throw AppError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
    }
    await this.customerRepository.delete(id);
  }

  async listDocuments(customerId: string, companyId?: string): Promise<ICustomerDocument[]> {
    const customer = await this.getCustomerById(customerId, companyId);
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
    companyId?: string,
  ): Promise<ICustomerDocument> {
    await this.getCustomerById(customerId, companyId);

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
      throw AppError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
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
    companyId?: string,
  ): Promise<void> {
    const customer = await this.getCustomerById(customerId, companyId);
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
      } catch {
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

  async getActivityLog(customerId: string, companyId?: string): Promise<ICustomerActivityLog[]> {
    const customer = await this.getCustomerById(customerId, companyId);
    const logs = customer.activity_log || [];
    return [...logs].reverse();
  }

  /**
   * Helper to fetch customer invoices and receipts across all modules
   */
  private async getCustomerTransactions(
    customer: ICustomer,
    companyId?: string,
  ): Promise<{
    invoices: Array<{
      id: string;
      date: string;
      refNo: string;
      type: 'invoice';
      description: string;
      debit: number;
      credit: number;
      status: string;
      createdAt: Date;
    }>;
    receipts: Array<{
      id: string;
      date: string;
      refNo: string;
      type: 'receipt';
      description: string;
      debit: number;
      credit: number;
      status: string;
      createdAt: Date;
    }>;
  }> {
    const customerId = customer._id;
    const escapedName = customer.name ? customer.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';

    // Standard invoices query
    const stdInvoiceQuery: any = {
      $and: [
        {
          $or: [
            { customer_id: customerId },
            ...(escapedName ? [{ customer_name: { $regex: `^${escapedName}$`, $options: 'i' } }] : []),
          ],
        },
        { status: { $nin: ['Cancelled', 'cancelled', 'Void', 'void'] } },
      ],
    };

    // Travel invoices query
    const travelInvoiceQuery: any = {
      customerId,
      status: { $nin: ['cancelled', 'void'] },
    };

    // Receipts query
    const receiptQuery: any = {
      $and: [
        {
          $or: [
            { customerId: customerId },
            ...(escapedName ? [{ customerName: { $regex: `^${escapedName}$`, $options: 'i' } }] : []),
          ],
        },
        { status: { $nin: ['Cancelled', 'cancelled'] } },
      ],
    };

    if (
      companyId &&
      companyId !== '000000000000000000000000' &&
      companyId !== 'all' &&
      Types.ObjectId.isValid(companyId)
    ) {
      const compCondition = {
        $or: [
          { companyId: new Types.ObjectId(companyId) },
          { companyId: null },
          { companyId: { $exists: false } },
        ],
      };
      stdInvoiceQuery.$and.push(compCondition);
      travelInvoiceQuery.$and = [compCondition];
      receiptQuery.$and.push(compCondition);
    }

    const [stdInvoices, travelInvoices, receipts] = await Promise.all([
      InvoiceModel.find(stdInvoiceQuery).sort({ createdAt: 1 }).exec(),
      TravelInvoiceModel.find(travelInvoiceQuery).sort({ createdAt: 1 }).exec(),
      ReceiptModel.find(receiptQuery).sort({ createdAt: 1 }).exec(),
    ]);

    const formattedInvoices: Array<{
      id: string;
      date: string;
      refNo: string;
      type: 'invoice';
      description: string;
      debit: number;
      credit: number;
      status: string;
      createdAt: Date;
    }> = [];

    for (const inv of stdInvoices) {
      const itemsDesc = inv.items?.map((i) => i.description).filter(Boolean).join(', ');
      const desc = itemsDesc || inv.service || inv.remarks || `Invoice ${inv.invoice_number}`;
      const invDate = inv.issue_date || (inv.createdAt ? inv.createdAt.toISOString().split('T')[0] : '');

      formattedInvoices.push({
        id: inv._id.toString(),
        date: invDate,
        refNo: inv.invoice_number || inv.custom_id || 'INV',
        type: 'invoice',
        description: desc,
        debit: CurrencyPrecision.round(inv.grand_total || 0),
        credit: 0.0,
        status: (inv.status || 'pending').toLowerCase().replace(/\s+/g, '_'),
        createdAt: inv.createdAt,
      });
    }

    for (const inv of travelInvoices) {
      const invDate = inv.createdAt ? inv.createdAt.toISOString().split('T')[0] : '';
      formattedInvoices.push({
        id: inv._id.toString(),
        date: invDate,
        refNo: inv.invoiceNumber || 'INV',
        type: 'invoice',
        description: `Travel Invoice ${inv.invoiceNumber}`,
        debit: CurrencyPrecision.round(inv.amount || 0),
        credit: 0.0,
        status: (inv.status || 'unpaid').toLowerCase().replace(/\s+/g, '_'),
        createdAt: inv.createdAt,
      });
    }

    const formattedReceipts = receipts.map((rec) => {
      const recDate = rec.date || (rec.createdAt ? rec.createdAt.toISOString().split('T')[0] : '');
      const desc =
        rec.notes ||
        (rec.paymentMethod ? `${rec.paymentMethod} - Advance Payment` : 'Receipt Payment');
      const isAdvance =
        (rec.unallocated_amount !== undefined && rec.unallocated_amount > 0) ||
        rec.allocations?.length === 0;

      return {
        id: rec._id.toString(),
        date: recDate,
        refNo: rec.reference || 'REC',
        type: 'receipt' as const,
        description: desc,
        debit: 0.0,
        credit: CurrencyPrecision.round(rec.amount || 0),
        status: isAdvance ? 'advance_credit' : (rec.status || 'received').toLowerCase(),
        createdAt: rec.createdAt,
      };
    });

    return { invoices: formattedInvoices, receipts: formattedReceipts };
  }

  /**
   * GET /api/v1/customers/:id/financial-summary
   */
  async getFinancialSummary(
    customerId: string,
    companyId?: string,
  ): Promise<CustomerFinancialSummaryResult> {
    const customer = await this.getCustomerById(customerId, companyId);
    const { invoices, receipts } = await this.getCustomerTransactions(customer, companyId);

    const totalBilledDebit = CurrencyPrecision.round(
      invoices.reduce((acc, inv) => acc + inv.debit, 0),
    );
    const totalReceivedCredit = CurrencyPrecision.round(
      receipts.reduce((acc, rec) => acc + rec.credit, 0),
    );

    const outstandingDues = CurrencyPrecision.round(
      Math.max(0, totalBilledDebit - totalReceivedCredit),
    );
    const remainingAdvanceCredit = CurrencyPrecision.round(
      Math.max(0, totalReceivedCredit - totalBilledDebit),
    );

    let accountStatus: 'SETTLED_AND_CREDIT_AVAILABLE' | 'DUE_OUTSTANDING' | 'SETTLED' = 'SETTLED';
    if (totalReceivedCredit > totalBilledDebit) {
      accountStatus = 'SETTLED_AND_CREDIT_AVAILABLE';
    } else if (totalBilledDebit > totalReceivedCredit) {
      accountStatus = 'DUE_OUTSTANDING';
    } else {
      accountStatus = 'SETTLED';
    }

    // Find last transaction date
    const allDates = [...invoices.map((i) => i.date), ...receipts.map((r) => r.date)].filter(
      Boolean,
    );
    allDates.sort();
    const lastTransactionDate = allDates.length > 0 ? allDates[allDates.length - 1] : null;

    return {
      customerId: customer._id.toString(),
      customerName: customer.name,
      currency: 'AED',
      totalBilledDebit,
      totalReceivedCredit,
      outstandingDues,
      remainingAdvanceCredit,
      accountStatus,
      metricsCount: {
        totalInvoices: invoices.length,
        totalReceipts: receipts.length,
      },
      lastTransactionDate,
    };
  }

  /**
   * GET /api/v1/customers/:id/ledger
   */
  async getLedger(
    customerId: string,
    filters: Partial<CustomerLedgerQueryDTO> = {},
    companyId?: string,
  ): Promise<CustomerLedgerResult> {
    const customer = await this.getCustomerById(customerId, companyId);
    const { invoices, receipts } = await this.getCustomerTransactions(customer, companyId);

    // Merge and sort chronologically
    const allEntries: Array<{
      id: string;
      date: string;
      refNo: string;
      type: 'invoice' | 'receipt';
      description: string;
      debit: number;
      credit: number;
      runningBalance: number;
      status: string;
      createdAt: Date;
    }> = [...invoices, ...receipts].map((item) => ({
      ...item,
      runningBalance: 0,
    }));

    allEntries.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Compute continuous running balance
    let running = CurrencyPrecision.round(customer.opening_balance || 0);
    for (const entry of allEntries) {
      running = CurrencyPrecision.round(running + entry.debit - entry.credit);
      entry.runningBalance = running;
    }

    // Filter entries
    let filtered = allEntries;
    if (filters.startDate) {
      filtered = filtered.filter((e) => e.date >= filters.startDate!);
    }
    if (filters.endDate) {
      filtered = filtered.filter((e) => e.date <= filters.endDate!);
    }
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter((e) => e.type === filters.type);
    }

    const totalDebit = CurrencyPrecision.round(
      filtered.reduce((acc, e) => acc + e.debit, 0),
    );
    const totalCredit = CurrencyPrecision.round(
      filtered.reduce((acc, e) => acc + e.credit, 0),
    );

    const openingBalance = CurrencyPrecision.round(customer.opening_balance || 0);
    const closingBalance =
      filtered.length > 0
        ? filtered[filtered.length - 1].runningBalance
        : CurrencyPrecision.round(openingBalance + totalDebit - totalCredit);

    // Pagination
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, filters.limit || 50);
    const totalRecords = filtered.length;
    const totalPages = Math.ceil(totalRecords / limit) || 1;
    const paginatedItems = filtered.slice((page - 1) * limit, page * limit);

    const data: CustomerLedgerItem[] = paginatedItems.map((item) => ({
      id: item.id,
      date: item.date,
      refNo: item.refNo,
      type: item.type,
      description: item.description,
      debit: item.debit,
      credit: item.credit,
      runningBalance: item.runningBalance,
      status: item.status,
    }));

    return {
      data,
      summary: {
        openingBalance,
        totalDebit,
        totalCredit,
        closingBalance,
      },
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
      },
    };
  }

  /**
   * POST /api/v1/customers/:id/allocate-credit
   */
  async allocateAdvanceCredit(
    customerId: string,
    data: AllocateCreditDTO,
    performedBy = 'System',
    companyId?: string,
  ): Promise<AllocateCreditResult> {
    const customer = await this.getCustomerById(customerId, companyId);
    const summary = await this.getFinancialSummary(customerId, companyId);

    const allocatedAmount = CurrencyPrecision.round(data.allocatedAmount);

    if (allocatedAmount > summary.remainingAdvanceCredit) {
      throw AppError.badRequest(
        'Attempted to allocate more advance credit than available',
        'INSUFFICIENT_CREDIT',
      );
    }

    const invoiceIdentifier = (data.invoiceId || data.invoiceRef || '').trim();

    // Look for standard invoice
    let stdInvoice = null;
    let travelInvoice = null;

    if (Types.ObjectId.isValid(invoiceIdentifier)) {
      stdInvoice = await InvoiceModel.findById(invoiceIdentifier).exec();
      if (!stdInvoice) {
        travelInvoice = await TravelInvoiceModel.findById(invoiceIdentifier).exec();
      }
    }

    if (!stdInvoice && !travelInvoice) {
      stdInvoice = await InvoiceModel.findOne({
        $or: [{ invoice_number: invoiceIdentifier }, { custom_id: invoiceIdentifier }],
      }).exec();
    }

    if (!stdInvoice && !travelInvoice) {
      travelInvoice = await TravelInvoiceModel.findOne({
        invoiceNumber: invoiceIdentifier,
      }).exec();
    }

    if (!stdInvoice && !travelInvoice) {
      throw AppError.notFound('Invoice specified for credit allocation was not found', 'INVOICE_NOT_FOUND');
    }

    let invoiceRemainingDue = 0;
    let invStatus = 'fully_paid';
    let targetInvoiceId = '';
    let targetInvoiceRef = '';

    if (stdInvoice) {
      targetInvoiceId = stdInvoice._id.toString();
      targetInvoiceRef = stdInvoice.invoice_number || stdInvoice.custom_id || targetInvoiceId;

      const grandTotal = CurrencyPrecision.round(stdInvoice.grand_total || 0);
      const currentPaid = CurrencyPrecision.round(stdInvoice.paid_amount || 0);
      const due = CurrencyPrecision.round(Math.max(0, grandTotal - currentPaid));

      if (due <= 0 || stdInvoice.status === 'Paid') {
        throw AppError.badRequest(
          'Invoice specified for credit allocation is already fully settled',
          'INVOICE_ALREADY_PAID',
        );
      }

      const effectiveAlloc = CurrencyPrecision.round(Math.min(allocatedAmount, due));
      const newPaid = CurrencyPrecision.round(currentPaid + effectiveAlloc);
      const newBalance = CurrencyPrecision.round(Math.max(0, grandTotal - newPaid));

      stdInvoice.paid_amount = newPaid;
      stdInvoice.balance_amount = newBalance;
      stdInvoice.status = newBalance <= 0 ? 'Paid' : 'Partially Paid';
      await stdInvoice.save();

      invoiceRemainingDue = newBalance;
      invStatus = newBalance <= 0 ? 'fully_paid' : 'partially_paid';
    } else if (travelInvoice) {
      targetInvoiceId = travelInvoice._id.toString();
      targetInvoiceRef = travelInvoice.invoiceNumber || targetInvoiceId;

      const totalPaid = CurrencyPrecision.round(
        (travelInvoice.payments || []).reduce((acc, p) => acc + (p.amount || 0), 0),
      );
      const due = CurrencyPrecision.round(Math.max(0, travelInvoice.amount - totalPaid));

      if (due <= 0 || travelInvoice.status === 'paid') {
        throw AppError.badRequest(
          'Invoice specified for credit allocation is already fully settled',
          'INVOICE_ALREADY_PAID',
        );
      }

      const effectiveAlloc = CurrencyPrecision.round(Math.min(allocatedAmount, due));
      travelInvoice.payments.push({
        amount: effectiveAlloc,
        date: new Date(),
        paymentMethod: 'other',
      });

      const totalAfter = CurrencyPrecision.round(totalPaid + effectiveAlloc);
      const newBalance = CurrencyPrecision.round(Math.max(0, travelInvoice.amount - totalAfter));
      travelInvoice.status = newBalance <= 0 ? 'paid' : 'partially_paid';
      await travelInvoice.save();

      invoiceRemainingDue = newBalance;
      invStatus = newBalance <= 0 ? 'fully_paid' : 'partially_paid';
    }

    // Deduct advance credit from customer's unallocated receipts FIFO
    let remainingToDeduct = allocatedAmount;
    const customerReceipts = await ReceiptModel.find({
      $or: [{ customerId: customer._id }, { customerName: customer.name }],
      status: { $ne: 'Cancelled' },
    })
      .sort({ date: 1, createdAt: 1 })
      .exec();

    for (const rec of customerReceipts) {
      if (remainingToDeduct <= 0) break;
      const unalloc =
        rec.unallocated_amount !== undefined
          ? rec.unallocated_amount
          : CurrencyPrecision.round(
              rec.amount - (rec.allocations || []).reduce((sum, a) => sum + a.allocated_amount, 0),
            );

      if (unalloc > 0) {
        const deduct = CurrencyPrecision.round(Math.min(unalloc, remainingToDeduct));
        rec.unallocated_amount = CurrencyPrecision.round(unalloc - deduct);
        rec.allocations.push({
          invoice_id: targetInvoiceRef,
          allocated_amount: deduct,
          remaining_invoice_balance: invoiceRemainingDue,
        });
        await rec.save();
        remainingToDeduct = CurrencyPrecision.round(remainingToDeduct - deduct);
      }
    }

    const customerRemainingAdvanceCredit = CurrencyPrecision.round(
      Math.max(0, summary.remainingAdvanceCredit - allocatedAmount),
    );

    const allocationId = `alloc_${Math.floor(1000 + Math.random() * 9000)}`;

    await this.customerRepository.addActivityLog(customer._id.toString(), {
      action: 'ADVANCE_CREDIT_ALLOCATED',
      description:
        data.notes ||
        `Allocated AED ${allocatedAmount} from customer advance credit balance to invoice ${targetInvoiceRef}`,
      performed_by: performedBy,
      timestamp: new Date(),
    });

    return {
      allocationId,
      invoiceId: targetInvoiceId,
      allocatedAmount,
      invoiceRemainingDue,
      customerRemainingAdvanceCredit,
      status: invStatus,
    };
  }
}

