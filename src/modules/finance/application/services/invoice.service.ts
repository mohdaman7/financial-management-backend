import { Types } from 'mongoose';
import {
  InvoiceRepository,
  InvoiceFilters,
  PaginationOptions,
} from '../../infrastructure/repositories/invoice.repository';
import {
  IInvoice,
  IInvoiceLineItem,
  IAdditionItem,
  IDeductionItem,
  IStatementEntry,
  InvoiceModel,
} from '../../infrastructure/models/Invoice.model';
import { ReceiptModel } from '../../infrastructure/models/Receipt.model';
import { CustomerModel } from '@modules/customer/infrastructure/models/Customer.model';
import { AppError } from '@shared/errors/AppError';
import { PdfGenerator } from '@shared/utils/pdfGenerator';
import { CurrencyPrecision } from '@shared/utils/currencyPrecision';
import {
  FifoAllocationEngine,
  FifoInvoiceInput,
  FifoReceiptInput,
  CustomerIdentity,
} from '@shared/utils/fifoAllocationEngine';

export interface CreateInvoiceDTO {
  invoice_number?: string;
  invoiceNumber?: string;
  invoice_type?: 'standard' | 'statement';
  customer_id?: string;
  customer_name: string;
  care_of?: string;
  contact_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  passenger_name?: string;
  lead_by: string;
  lead_owner?: string;
  employee?: string;
  category?: string;
  issue_date?: string;
  due_date?: string;
  payment_terms?: string;
  remarks?: string;
  currency?: string;
  status?: string;
  amount?: number;
  total?: number;
  grand_total?: number;
  grandTotal?: number;
  subtotal?: number;
  vat?: number;
  paid_amount?: number;
  paidAmount?: number;
  advance_paid?: number;
  advancePaid?: number;
  advance_amount?: number;
  advanceAmount?: number;
  advance?: number;
  balance_amount?: number;
  balanceAmount?: number;

  items?: Array<{
    id?: string;
    item?: string;
    description: string;
    nbNo?: string;
    name?: string;
    transNo?: string;
    qty?: number;
    rate?: number;
    tax?: number;
    withdrawDt?: string;
    account?: string;
    govCost?: number;
    totCost?: number;
    supl?: string;
    suplFee?: number;
    pro?: string;
    proComm?: number;
    commFrom?: string;
    commRecvd?: number;
    disc?: number;
  }>;

  addition_items?: Array<{
    particular: string;
    value: number;
  }>;

  deduction_items?: Array<{
    particular: string;
    value: number;
  }>;

  period_start?: string;
  period_end?: string;
  opening_balance?: number;
  statement_entries?: Array<{
    date: string;
    details: string;
    debit: number;
    credit: number;
  }>;
}

export interface ExportPdfOptions {
  format?: 'pdf' | 'png';
  print_header_logo?: boolean;
  include_bank_details?: boolean;
  watermark?: boolean;
}

export class InvoiceService {
  constructor(private invoiceRepository: InvoiceRepository) {}

  private calculateFinancials(data: CreateInvoiceDTO) {
    const rawItems = Array.isArray(data.items) ? data.items : [];
    const additionItems: IAdditionItem[] = Array.isArray(data.addition_items)
      ? data.addition_items.map((a) => ({ particular: a.particular, value: Number(a.value) || 0 }))
      : [];
    const deductionItems: IDeductionItem[] = Array.isArray(data.deduction_items)
      ? data.deduction_items.map((d) => ({ particular: d.particular, value: Number(d.value) || 0 }))
      : [];
    const statementEntries: IStatementEntry[] = Array.isArray(data.statement_entries)
      ? data.statement_entries.map((e) => ({
          date: e.date,
          details: e.details,
          debit: Number(e.debit) || 0,
          credit: Number(e.credit) || 0,
        }))
      : [];

    const computedItems: IInvoiceLineItem[] = rawItems.map((item, index) => {
      const qty = item.qty !== undefined ? Number(item.qty) : 1;
      const rate = item.rate !== undefined ? Number(item.rate) : 0;
      const disc = Number(item.disc) || 0;
      const tax = item.tax !== undefined ? Number(item.tax) : 0;
      const netAmount = CurrencyPrecision.round(qty * rate - disc);
      const govCost = Number(item.govCost) || 0;
      const suplFee = Number(item.suplFee) || 0;
      const totCost = CurrencyPrecision.round(govCost + suplFee);
      const proComm = Number(item.proComm) || 0;
      const netProfit = CurrencyPrecision.round(netAmount - totCost - proComm);

      return {
        id: item.id || `tj-${index + 1}`,
        item: item.item || 'Visa Service',
        description: item.description,
        nbNo: item.nbNo || '',
        name: item.name || '',
        transNo: item.transNo || '',
        qty,
        rate,
        tax,
        netAmount,
        withdrawDt: item.withdrawDt || '',
        account: item.account || 'Visa Revenue',
        govCost,
        totCost,
        supl: item.supl || '',
        suplFee,
        pro: item.pro || '',
        proComm,
        commFrom: item.commFrom || '',
        commRecvd: Number(item.commRecvd) || 0,
        disc,
        netProfit,
      };
    });

    let subtotal = CurrencyPrecision.round(
      computedItems.reduce((acc, it) => acc + (it.netAmount || 0), 0),
    );
    let vat = CurrencyPrecision.round(
      computedItems.reduce(
        (acc, it) => acc + CurrencyPrecision.calculateVat(it.netAmount || 0, it.tax || 0),
        0,
      ),
    );

    const additions = CurrencyPrecision.round(additionItems.reduce((acc, it) => acc + it.value, 0));
    const deductions = CurrencyPrecision.round(
      deductionItems.reduce((acc, it) => acc + it.value, 0),
    );

    if (
      data.invoice_type === 'statement' &&
      computedItems.length === 0 &&
      statementEntries.length > 0
    ) {
      const debitTotal = statementEntries.reduce((acc, e) => acc + e.debit, 0);
      subtotal = CurrencyPrecision.round(debitTotal);
      vat = 0;
    }

    if (subtotal === 0 && computedItems.length === 0 && statementEntries.length === 0) {
      if (data.subtotal !== undefined) subtotal = Number(data.subtotal) || 0;
      if (data.vat !== undefined) vat = Number(data.vat) || 0;
    }

    let grand_total = CurrencyPrecision.round(subtotal + vat + additions - deductions);
    if (grand_total === 0 && (data.grand_total || data.grandTotal || data.total || data.amount)) {
      grand_total = CurrencyPrecision.round(
        Number(data.grand_total ?? data.grandTotal ?? data.total ?? data.amount ?? 0),
      );
    }

    const total_profit = CurrencyPrecision.round(
      computedItems.reduce((acc, it) => acc + (it.netProfit || 0), 0) + additions - deductions,
    );

    const advance_paid = CurrencyPrecision.round(
      Number(
        data.advance_paid ??
        (data as any).advancePaid ??
        data.advance_amount ??
        (data as any).advanceAmount ??
        0
      )
    );

    let paid_amount = 0;
    const explicitPaid =
      data.paid_amount !== undefined && data.paid_amount !== null
        ? Number(data.paid_amount)
        : data.paidAmount !== undefined && data.paidAmount !== null
          ? Number(data.paidAmount)
          : advance_paid > 0
            ? advance_paid
            : data.advance !== undefined && data.advance !== null
              ? Number(data.advance)
              : undefined;

    if (explicitPaid !== undefined && !isNaN(explicitPaid)) {
      paid_amount = explicitPaid;
    } else if (
      (data.status === 'Paid' || data.status === 'paid') &&
      data.payment_terms !== 'CREDIT' &&
      data.payment_terms !== 'PARTIAL'
    ) {
      paid_amount = grand_total;
    } else if (!data.status && data.payment_terms === 'CASH') {
      paid_amount = grand_total;
    }

    paid_amount = CurrencyPrecision.round(paid_amount);

    let balance_amount =
      data.balance_amount !== undefined && data.balance_amount !== null && !isNaN(Number(data.balance_amount)) && explicitPaid === undefined
        ? Number(data.balance_amount)
        : data.balanceAmount !== undefined && data.balanceAmount !== null && !isNaN(Number(data.balanceAmount)) && explicitPaid === undefined
          ? Number(data.balanceAmount)
          : Math.max(0, CurrencyPrecision.round(grand_total - paid_amount));

    if (paid_amount > 0 && paid_amount < grand_total) {
      balance_amount = Math.max(0, CurrencyPrecision.round(grand_total - paid_amount));
    }

    let status = data.status;
    if (paid_amount >= grand_total && grand_total > 0) {
      status = 'Paid';
    } else if (paid_amount > 0 && paid_amount < grand_total) {
      status = 'Partially Paid';
    } else if (paid_amount === 0) {
      if (!status || status.toLowerCase() === 'paid' || status.toLowerCase() === 'partially paid' || status.toLowerCase() === 'partially_paid') {
        status = 'Pending';
      }
    }

    const service =
      computedItems.length > 0
        ? computedItems[0].description || computedItems[0].item || 'Visa Services'
        : data.category || 'General';

    return {
      items: computedItems,
      addition_items: additionItems,
      deduction_items: deductionItems,
      statement_entries: statementEntries,
      subtotal,
      vat,
      additions,
      deductions,
      grand_total,
      total_profit,
      paid_amount,
      balance_amount,
      advance_paid,
      status,
      service,
    };
  }

  async createInvoice(
    companyId: string | undefined,
    data: CreateInvoiceDTO,
    createdBy = 'System',
  ): Promise<any> {
    if (!data.customer_name || !data.customer_name.trim()) {
      throw AppError.badRequest(
        "Field 'customer_name' is required when creating an invoice.",
        'MISSING_REQUIRED_FIELD',
      );
    }

    if (Array.isArray(data.items)) {
      for (const item of data.items) {
        if (item.qty !== undefined && item.qty < 1) {
          throw AppError.unprocessable(
            'Invalid numeric line item rate or negative quantity',
            'INVALID_NUMERIC_INPUT',
          );
        }
        if (item.rate !== undefined && item.rate < 0) {
          throw AppError.unprocessable(
            'Invalid numeric line item rate or negative quantity',
            'INVALID_NUMERIC_INPUT',
          );
        }
      }
    }

    const count = await this.invoiceRepository.count(companyId);
    const invoiceNumber = data.invoice_number || (data as any).invoiceNumber || (18500 + count + 1).toString();
    const customId = `inv-tajweed-${invoiceNumber}`;

    const financials = this.calculateFinancials(data);

    let customerIdObj: Types.ObjectId | undefined =
      data.customer_id && Types.ObjectId.isValid(data.customer_id)
        ? new Types.ObjectId(data.customer_id)
        : undefined;

    if (!customerIdObj && data.customer_name && data.customer_name.trim()) {
      const companyObjectId =
        companyId && Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : undefined;
      const escapedName = data.customer_name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matchedCust = await CustomerModel.findOne({
        ...(companyObjectId ? { companyId: companyObjectId } : {}),
        name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
      }).exec();
      if (matchedCust) {
        customerIdObj = matchedCust._id;
      }
    }

    const invoice = await this.invoiceRepository.create({
      companyId:
        companyId && Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : undefined,
      custom_id: customId,
      invoice_number: invoiceNumber,
      file_no: invoiceNumber,
      invoice_type: data.invoice_type || 'standard',
      customer_id: customerIdObj,
      customer_name: data.customer_name.trim(),
      care_of: data.care_of || '',
      contact_name: data.contact_name || '',
      customer_email: data.customer_email || '',
      customer_phone: data.customer_phone || '',
      customer_address: data.customer_address || '',
      passenger_name: data.passenger_name || '',
      lead_by: data.lead_by || 'SAMEER EDAKKADAMBAN',
      lead_owner: data.lead_owner || data.lead_by || 'SAMEER EDAKKADAMBAN',
      employee: data.employee || 'Staff',
      category: data.category || 'Visa Services',
      issue_date: data.issue_date || new Date().toISOString().split('T')[0],
      due_date: data.due_date || new Date().toISOString().split('T')[0],
      payment_terms: data.payment_terms || 'CASH',
      remarks: data.remarks || '',
      currency: data.currency || 'AED',
      status: financials.status,

      items: financials.items,
      addition_items: financials.addition_items,
      deduction_items: financials.deduction_items,
      statement_entries: financials.statement_entries,

      subtotal: financials.subtotal,
      vat: financials.vat,
      additions: financials.additions,
      deductions: financials.deductions,
      grand_total: financials.grand_total,
      total_profit: financials.total_profit,
      paid_amount: financials.paid_amount,
      balance_amount: financials.balance_amount,
      advance_paid: financials.advance_paid || 0,
      service: financials.service,

      period_start: data.period_start || '',
      period_end: data.period_end || '',
      opening_balance: Number(data.opening_balance) || 0,

      created_by: createdBy,
    });

    return this.formatInvoiceDetail(invoice);
  }

  private async computeFifoAllocationsForInvoices(
    companyId?: string,
  ): Promise<Map<string, { paid: number; remaining: number; status: string; advancePaid: number }>> {
    const companyObjectId =
      companyId && Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : undefined;
    const queryCompany: Record<string, any> = companyObjectId ? { companyId: companyObjectId } : {};

    const [stdInvoices, receipts, customers] = await Promise.all([
      InvoiceModel.find({
        ...queryCompany,
        status: { $nin: ['Cancelled', 'cancelled', 'Void', 'void'] },
      })
        .sort({ issue_date: 1, createdAt: 1 })
        .lean()
        .exec(),
      ReceiptModel.find({
        ...queryCompany,
        status: { $nin: ['Cancelled', 'cancelled'] },
      })
        .sort({ date: 1, createdAt: 1 })
        .lean()
        .exec(),
      CustomerModel.find(queryCompany).lean().exec(),
    ]);

    // Build map of receipt amounts already explicitly allocated to invoices
    const receiptAllocationsByInv = new Map<string, number>();
    for (const rec of receipts) {
      if (rec.allocations && Array.isArray(rec.allocations)) {
        for (const a of rec.allocations) {
          if (a.invoice_id) {
            const k = a.invoice_id.trim().toLowerCase();
            receiptAllocationsByInv.set(
              k,
              CurrencyPrecision.round((receiptAllocationsByInv.get(k) || 0) + (a.allocated_amount || 0)),
            );
          }
        }
      }
      if (rec.invoiceId) {
        const k = rec.invoiceId.toString().trim().toLowerCase();
        if (!rec.allocations || rec.allocations.length === 0) {
          receiptAllocationsByInv.set(
            k,
            CurrencyPrecision.round((receiptAllocationsByInv.get(k) || 0) + (rec.amount || 0)),
          );
        }
      }
    }

    const fifoInvoices: FifoInvoiceInput[] = stdInvoices.map((inv) => {
      const invId = inv._id.toString().toLowerCase();
      const invNum = (inv.invoice_number || '').trim().toLowerCase();
      const customId = (inv.custom_id || '').trim().toLowerCase();
      const receiptAllocated = Math.max(
        receiptAllocationsByInv.get(invId) || 0,
        invNum ? receiptAllocationsByInv.get(invNum) || 0 : 0,
        customId ? receiptAllocationsByInv.get(customId) || 0 : 0,
      );

      const advancePaid =
        inv.advance_paid !== undefined && inv.advance_paid > 0
          ? inv.advance_paid
          : CurrencyPrecision.round(Math.max(0, (inv.paid_amount || 0) - receiptAllocated));

      return {
        id: inv._id.toString(),
        mongoId: inv._id.toString(),
        customerId: inv.customer_id ? inv.customer_id.toString() : undefined,
        customerName: inv.customer_name,
        grandTotal: inv.grand_total || 0,
        advancePaid,
        date: inv.issue_date || (inv.createdAt ? new Date(inv.createdAt).toISOString().split('T')[0] : ''),
        createdAt: inv.createdAt ? new Date(inv.createdAt) : new Date(),
      };
    });

    const fifoReceipts: FifoReceiptInput[] = receipts.map((rec) => ({
      id: rec._id.toString(),
      mongoId: rec._id.toString(),
      customerId: rec.customerId ? rec.customerId.toString() : undefined,
      customerName: rec.customerName,
      amount: rec.amount || 0,
      date: rec.date || (rec.createdAt ? new Date(rec.createdAt).toISOString().split('T')[0] : ''),
      createdAt: rec.createdAt ? new Date(rec.createdAt) : new Date(),
      invoiceId: rec.invoiceId ? rec.invoiceId.toString() : undefined,
      allocations: (rec.allocations || []).map((a: any) => ({
        invoice_id: a.invoice_id,
        allocated_amount: a.allocated_amount,
      })),
    }));

    const customerIdentities: CustomerIdentity[] = customers.map((c: any) => ({
      id: c._id.toString(),
      name: c.name,
      companyName: c.company_name || c.companyName,
    }));

    const allocationResult = FifoAllocationEngine.calculate(
      fifoInvoices,
      fifoReceipts,
      customerIdentities,
    );

    // Sync database asynchronously
    FifoAllocationEngine.persistAllocations(fifoInvoices, fifoReceipts, allocationResult).catch(() => {});

    return allocationResult.invoiceAllocations;
  }

  async listInvoices(
    companyId?: string,
    filters: InvoiceFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 },
  ): Promise<{
    data: any[];
    meta: { total_records: number; page: number; limit: number; total_pages: number };
  }> {
    const { invoices, total, page, limit, total_pages } = await this.invoiceRepository.findFiltered(
      companyId,
      filters,
      pagination,
    );

    const allocationMap = await this.computeFifoAllocationsForInvoices(companyId);

    const formattedList = invoices.map((inv) => {
      const allocation = allocationMap.get(inv._id.toString());
      const paid = allocation !== undefined ? allocation.paid : (inv.paid_amount || 0);
      const remaining = allocation !== undefined ? allocation.remaining : (inv.balance_amount || 0);
      const status = allocation !== undefined ? allocation.status : inv.status;
      const custIdStr = inv.customer_id ? inv.customer_id.toString() : '';

      return {
        id: inv.custom_id || inv._id.toString(),
        invoice_number: inv.invoice_number,
        invoiceNumber: inv.invoice_number,
        customer_id: custIdStr,
        customerId: custIdStr,
        customer_name: inv.customer_name,
        customerName: inv.customer_name,
        service: inv.service || (inv.items?.[0]?.description ?? inv.category ?? 'General'),
        invoice_date: inv.issue_date,
        invoiceDate: inv.issue_date,
        due_date: inv.due_date,
        dueDate: inv.due_date,
        lead_owner: inv.lead_owner || inv.lead_by,
        subtotal: inv.subtotal,
        vat: inv.vat,
        total: inv.grand_total,
        totalAmount: inv.grand_total,
        grand_total: inv.grand_total,
        advance_paid: inv.advance_paid || 0,
        advancePaid: inv.advance_paid || 0,
        paid,
        paid_amount: paid,
        paidAmount: paid,
        outstanding: remaining,
        remaining,
        balance_amount: remaining,
        status,
      };
    });

    return {
      data: formattedList,
      meta: {
        total_records: total,
        page,
        limit,
        total_pages,
      },
    };
  }

  async getOutstandingInvoices(
    companyId?: string,
    filters: { search?: string; status?: string; start_date?: string; end_date?: string } = {},
  ): Promise<{
    data: Array<any>;
    summary: {
      totalOutstanding: number;
      totalInvoices: number;
      overdueCount: number;
    };
  }> {
    const companyObjectId =
      companyId && Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : undefined;
    const queryCompany: Record<string, any> = companyObjectId ? { companyId: companyObjectId } : {};

    const [stdInvoices, allocationMap, customers] = await Promise.all([
      InvoiceModel.find({
        ...queryCompany,
        status: { $nin: ['Cancelled', 'cancelled', 'Void', 'void'] },
      })
        .sort({ issue_date: 1, createdAt: 1 })
        .lean()
        .exec(),
      this.computeFifoAllocationsForInvoices(companyId),
      CustomerModel.find(queryCompany).lean().exec(),
    ]);

    const normalizeName = (name?: string) =>
      (name || '').trim().toLowerCase().replace(/\s+/g, ' ');

    const nameToCustomerId = new Map<string, string>();
    for (const c of customers) {
      const cid = c._id.toString();
      if (c.name) nameToCustomerId.set(normalizeName(c.name), cid);
      if ((c as any).company_name) nameToCustomerId.set(normalizeName((c as any).company_name), cid);
    }

    const list: Array<any> = [];
    const now = Date.now();

    for (const inv of stdInvoices) {
      const total = CurrencyPrecision.round(inv.grand_total || 0);
      const allocation = allocationMap.get(inv._id.toString()) || {
        paid: CurrencyPrecision.round(inv.paid_amount || 0),
        remaining: CurrencyPrecision.round(inv.balance_amount || 0),
        status: inv.status || 'Pending',
        advancePaid: inv.advance_paid || 0,
      };
      const paid = allocation.paid;
      const outstanding = allocation.remaining;
      if (outstanding <= 0) continue;

      const dueDateStr = inv.due_date || inv.issue_date || '';
      const dueTimestamp = dueDateStr ? new Date(dueDateStr).getTime() : now;
      const diffDays = Math.ceil((now - dueTimestamp) / (1000 * 60 * 60 * 24));
      const daysOverdue = Math.max(0, diffDays);
      const status = daysOverdue > 0 ? 'Overdue' : 'Due Soon';

      const resolvedCustId = inv.customer_id
        ? inv.customer_id.toString()
        : (nameToCustomerId.get(normalizeName(inv.customer_name)) || '');

      list.push({
        id: inv.custom_id || inv._id.toString(),
        invoiceId: inv.invoice_number || inv.custom_id || inv._id.toString(),
        invoice_number: inv.invoice_number,
        invoiceNumber: inv.invoice_number,
        customerName: inv.customer_name || 'Customer',
        customer_name: inv.customer_name || 'Customer',
        customerId: resolvedCustId,
        customer_id: resolvedCustId,
        invoiceDate: inv.issue_date || '',
        invoice_date: inv.issue_date || '',
        dueDate: dueDateStr,
        due_date: dueDateStr,
        total,
        totalAmount: total,
        grand_total: total,
        advance_paid: inv.advance_paid || 0,
        advancePaid: inv.advance_paid || 0,
        paid,
        paidAmount: paid,
        paid_amount: paid,
        outstanding,
        remaining: outstanding,
        balance_amount: outstanding,
        daysOverdue,
        status,
      });
    }

    let filtered = list;

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      filtered = filtered.filter(
        (i) => i.invoiceId.toLowerCase().includes(q) || i.customerName.toLowerCase().includes(q),
      );
    }

    if (filters.status && filters.status.trim()) {
      const st = filters.status.trim().toLowerCase();
      filtered = filtered.filter((i) => i.status.toLowerCase() === st);
    }

    if (filters.start_date) {
      filtered = filtered.filter((i) => i.invoiceDate >= filters.start_date!);
    }
    if (filters.end_date) {
      filtered = filtered.filter((i) => i.invoiceDate <= filters.end_date!);
    }

    const totalOutstanding = CurrencyPrecision.round(
      filtered.reduce((sum, i) => sum + i.outstanding, 0),
    );
    const overdueCount = filtered.filter((i) => i.daysOverdue > 0).length;

    return {
      data: filtered,
      summary: {
        totalOutstanding,
        totalInvoices: filtered.length,
        overdueCount,
      },
    };
  }

  async getInvoiceById(id: string): Promise<any> {
    const invoice = await this.invoiceRepository.findById(id);
    if (!invoice) {
      throw AppError.notFound(`Invoice with ID '${id}' not found`, 'NOT_FOUND');
    }
    const allocationMap = await this.computeFifoAllocationsForInvoices(
      invoice.companyId ? invoice.companyId.toString() : undefined,
    );
    const allocation = allocationMap.get(invoice._id.toString());
    return this.formatInvoiceDetail(invoice, allocation);
  }

  async updateInvoice(id: string, data: Partial<CreateInvoiceDTO>): Promise<any> {
    const existing = await this.invoiceRepository.findById(id);
    if (!existing) {
      throw AppError.notFound(`Invoice with ID '${id}' not found`, 'NOT_FOUND');
    }

    if (Array.isArray(data.items)) {
      for (const item of data.items) {
        if (item.qty !== undefined && item.qty < 1) {
          throw AppError.unprocessable(
            'Invalid numeric line item rate or negative quantity',
            'INVALID_NUMERIC_INPUT',
          );
        }
        if (item.rate !== undefined && item.rate < 0) {
          throw AppError.unprocessable(
            'Invalid numeric line item rate or negative quantity',
            'INVALID_NUMERIC_INPUT',
          );
        }
      }
    }

    const mergedData: CreateInvoiceDTO = {
      invoice_type: (data.invoice_type ?? existing.invoice_type) as any,
      customer_name: data.customer_name ?? existing.customer_name,
      care_of: data.care_of ?? existing.care_of,
      contact_name: data.contact_name ?? existing.contact_name,
      customer_email: data.customer_email ?? existing.customer_email,
      customer_phone: data.customer_phone ?? existing.customer_phone,
      customer_address: data.customer_address ?? existing.customer_address,
      passenger_name: data.passenger_name ?? existing.passenger_name,
      lead_by: data.lead_by ?? existing.lead_by,
      lead_owner: data.lead_owner ?? existing.lead_owner,
      employee: data.employee ?? existing.employee,
      category: data.category ?? existing.category,
      issue_date: data.issue_date ?? existing.issue_date,
      due_date: data.due_date ?? existing.due_date,
      payment_terms: data.payment_terms ?? existing.payment_terms,
      remarks: data.remarks ?? existing.remarks,
      currency: data.currency ?? existing.currency,
      status: data.status ?? existing.status,
      advance_paid:
        data.advance_paid !== undefined
          ? Number(data.advance_paid)
          : (data as any).advancePaid !== undefined
            ? Number((data as any).advancePaid)
            : data.advance_amount !== undefined
              ? Number(data.advance_amount)
              : (data as any).advanceAmount !== undefined
                ? Number((data as any).advanceAmount)
                : existing.advance_paid ?? 0,
      paid_amount:
        data.paid_amount !== undefined
          ? Number(data.paid_amount)
          : (data as any).paidAmount !== undefined
            ? Number((data as any).paidAmount)
            : existing.paid_amount,
      balance_amount: data.balance_amount ?? (data as any).balanceAmount ?? existing.balance_amount,
      items: data.items ?? (existing.items as any),
      addition_items: data.addition_items ?? (existing.addition_items as any),
      deduction_items: data.deduction_items ?? (existing.deduction_items as any),
      period_start: data.period_start ?? existing.period_start,
      period_end: data.period_end ?? existing.period_end,
      opening_balance: data.opening_balance ?? existing.opening_balance,
      statement_entries: data.statement_entries ?? (existing.statement_entries as any),
    };

    const financials = this.calculateFinancials(mergedData);

    let updatedCustomerId =
      mergedData.customer_id && Types.ObjectId.isValid(mergedData.customer_id)
        ? new Types.ObjectId(mergedData.customer_id)
        : existing.customer_id;

    if (!updatedCustomerId && mergedData.customer_name && mergedData.customer_name.trim()) {
      const escapedName = mergedData.customer_name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matchedCust = await CustomerModel.findOne({
        name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
      }).exec();
      if (matchedCust) {
        updatedCustomerId = matchedCust._id;
      }
    }

    const updatePayload: Partial<IInvoice> = {
      ...mergedData,
      customer_id: updatedCustomerId,
      status: financials.status,
      items: financials.items,
      addition_items: financials.addition_items,
      deduction_items: financials.deduction_items,
      statement_entries: financials.statement_entries,
      subtotal: financials.subtotal,
      vat: financials.vat,
      additions: financials.additions,
      deductions: financials.deductions,
      grand_total: financials.grand_total,
      total_profit: financials.total_profit,
      paid_amount: financials.paid_amount,
      balance_amount: financials.balance_amount,
      advance_paid:
        financials.advance_paid !== undefined && financials.advance_paid > 0
          ? financials.advance_paid
          : existing.advance_paid || 0,
      service: financials.service,
    };

    const updated = await this.invoiceRepository.update(id, updatePayload);
    if (!updated) {
      throw AppError.notFound(`Invoice with ID '${id}' not found`, 'NOT_FOUND');
    }

    return this.formatInvoiceDetail(updated);
  }

  async deleteInvoice(id: string): Promise<void> {
    const existing = await this.invoiceRepository.findById(id);
    if (!existing) {
      throw AppError.notFound(`Invoice with ID '${id}' not found`, 'NOT_FOUND');
    }

    await this.invoiceRepository.delete(id);
  }

  async exportPdf(
    id: string,
    options: ExportPdfOptions = {},
  ): Promise<{ buffer: Buffer; filename: string }> {
    const invoice = await this.invoiceRepository.findById(id);
    if (!invoice) {
      throw AppError.notFound(`Invoice with ID '${id}' not found`, 'NOT_FOUND');
    }

    const safeCustomer = (invoice.contact_name || invoice.customer_name || 'CUSTOMER')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toUpperCase();
    const filename = `INVOICE_${invoice.invoice_number}_${safeCustomer}.pdf`;

    const buffer = PdfGenerator.generateInvoicePdf({
      invoice_number: invoice.invoice_number,
      file_no: invoice.file_no,
      invoice_type: invoice.invoice_type,
      customer_name: invoice.customer_name,
      care_of: invoice.care_of,
      contact_name: invoice.contact_name,
      customer_phone: invoice.customer_phone,
      customer_email: invoice.customer_email,
      passenger_name: invoice.passenger_name,
      lead_by: invoice.lead_by,
      category: invoice.category,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      payment_terms: invoice.payment_terms,
      status: invoice.status,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      vat: invoice.vat,
      additions: invoice.additions,
      deductions: invoice.deductions,
      grand_total: invoice.grand_total,
      paid_amount: invoice.paid_amount,
      balance_amount: invoice.balance_amount,
      remarks: invoice.remarks,
      items: invoice.items,
      statement_entries: invoice.statement_entries,
      opening_balance: invoice.opening_balance,
      options,
    });

    return { buffer, filename };
  }

  private formatInvoiceDetail(
    invoice: IInvoice,
    allocation?: { paid: number; remaining: number; status: string; advancePaid?: number },
  ): any {
    const paid = allocation !== undefined ? allocation.paid : (invoice.paid_amount || 0);
    const remaining = allocation !== undefined ? allocation.remaining : (invoice.balance_amount || 0);
    const status = allocation !== undefined ? allocation.status : invoice.status;

    return {
      id: invoice.custom_id || invoice._id.toString(),
      invoice_number: invoice.invoice_number,
      file_no: invoice.file_no || invoice.invoice_number,
      invoice_type: invoice.invoice_type || 'standard',
      customer_id: invoice.customer_id ? invoice.customer_id.toString() : '',
      customer_name: invoice.customer_name,
      contact_name: invoice.contact_name || invoice.customer_name,
      customer_phone: invoice.customer_phone || '',
      customer_email: invoice.customer_email || '',
      customer_address: invoice.customer_address || '',
      care_of: invoice.care_of || '',
      lead_by: invoice.lead_by,
      lead_owner: invoice.lead_owner || invoice.lead_by,
      employee: invoice.employee || 'Staff',
      category: invoice.category || 'Visa Services',
      issue_date: invoice.issue_date,
      invoice_date: invoice.issue_date,
      due_date: invoice.due_date,
      payment_terms: invoice.payment_terms,
      status,
      currency: invoice.currency || 'AED',
      remarks: invoice.remarks || '',
      service: invoice.service || '',
      items: invoice.items || [],
      addition_items: invoice.addition_items || [],
      deduction_items: invoice.deduction_items || [],
      statement_entries: invoice.statement_entries || [],
      period_start: invoice.period_start || '',
      period_end: invoice.period_end || '',
      opening_balance: invoice.opening_balance || 0,
      subtotal: invoice.subtotal,
      vat: invoice.vat,
      additions: invoice.additions,
      deductions: invoice.deductions,
      grand_total: invoice.grand_total,
      total: invoice.grand_total,
      totalAmount: invoice.grand_total,
      total_profit: invoice.total_profit,
      advance_paid: invoice.advance_paid || 0,
      advancePaid: invoice.advance_paid || 0,
      paid_amount: paid,
      paid,
      paidAmount: paid,
      balance_amount: remaining,
      remaining,
      outstanding: remaining,
      created_at: invoice.createdAt ? invoice.createdAt.toISOString() : new Date().toISOString(),
      updated_at: invoice.updatedAt ? invoice.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}
