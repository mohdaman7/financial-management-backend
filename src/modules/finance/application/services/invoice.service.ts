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
import { TravelInvoiceModel } from '../../../travel/infrastructure/models/TravelInvoice.model';
import { AppError } from '@shared/errors/AppError';
import { PdfGenerator } from '@shared/utils/pdfGenerator';
import { CurrencyPrecision } from '@shared/utils/currencyPrecision';

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

    const invoice = await this.invoiceRepository.create({
      companyId:
        companyId && Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : undefined,
      custom_id: customId,
      invoice_number: invoiceNumber,
      file_no: invoiceNumber,
      invoice_type: data.invoice_type || 'standard',
      customer_id:
        data.customer_id && Types.ObjectId.isValid(data.customer_id)
          ? new Types.ObjectId(data.customer_id)
          : undefined,
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
  ): Promise<Map<string, { paid: number; remaining: number; status: string }>> {
    const companyObjectId =
      companyId && Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : undefined;
    const queryCompany: Record<string, any> = companyObjectId ? { companyId: companyObjectId } : {};

    const [stdInvoices, travelInvoices, receipts] = await Promise.all([
      InvoiceModel.find({
        ...queryCompany,
        status: { $nin: ['Cancelled', 'cancelled', 'Void', 'void'] },
      })
        .sort({ issue_date: 1, createdAt: 1 })
        .lean()
        .exec(),
      TravelInvoiceModel.find(queryCompany)
        .sort({ createdAt: 1 })
        .lean()
        .exec(),
      ReceiptModel.find({
        ...queryCompany,
        status: { $nin: ['Cancelled', 'cancelled'] },
      })
        .sort({ date: 1, createdAt: 1 })
        .lean()
        .exec(),
    ]);

    const customerInvoicesMap = new Map<
      string,
      Array<{ id: string; total: number; advance_paid: number }>
    >();
    const allocationResultMap = new Map<string, { paid: number; remaining: number; status: string }>();

    for (const inv of stdInvoices) {
      const custKey = inv.customer_id
        ? inv.customer_id.toString()
        : (inv.customer_name || '').trim().toLowerCase();
      if (!custKey) continue;
      const list = customerInvoicesMap.get(custKey) || [];
      const basePaid = CurrencyPrecision.round(
        inv.advance_paid !== undefined && inv.advance_paid > 0
          ? inv.advance_paid
          : (inv.paid_amount || 0),
      );
      list.push({
        id: inv._id.toString(),
        total: CurrencyPrecision.round(inv.grand_total || 0),
        advance_paid: basePaid,
      });
      customerInvoicesMap.set(custKey, list);
    }

    for (const trInv of travelInvoices) {
      const custKey = (trInv as any).customerId
        ? (trInv as any).customerId.toString()
        : ((trInv as any).customerName || '').trim().toLowerCase();
      if (!custKey) continue;
      const list = customerInvoicesMap.get(custKey) || [];
      const trPaid = CurrencyPrecision.round(
        (trInv.payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
      );
      list.push({
        id: trInv._id.toString(),
        total: CurrencyPrecision.round(trInv.amount || 0),
        advance_paid: trPaid,
      });
      customerInvoicesMap.set(custKey, list);
    }

    const customerReceiptsMap = new Map<string, any[]>();
    for (const rec of receipts) {
      const custKey = rec.customerId
        ? rec.customerId.toString()
        : (rec.customerName || '').trim().toLowerCase();
      if (!custKey) continue;
      const list = customerReceiptsMap.get(custKey) || [];
      list.push(rec);
      customerReceiptsMap.set(custKey, list);
    }

    customerInvoicesMap.forEach((invoicesList, custKey) => {
      const receiptsList = customerReceiptsMap.get(custKey) || [];

      const invoiceDues = invoicesList.map((inv) => {
        const initialPaid = inv.advance_paid || 0;
        return {
          id: inv.id,
          total: inv.total,
          advancePaid: initialPaid,
          allocatedFromReceipts: 0,
          remainingDue: CurrencyPrecision.round(Math.max(0, inv.total - initialPaid)),
        };
      });

      for (const rec of receiptsList) {
        let availableCredit = CurrencyPrecision.round(rec.amount || 0);

        for (const inv of invoiceDues) {
          if (inv.remainingDue <= 0 || availableCredit <= 0) continue;
          const toAllocate = CurrencyPrecision.round(Math.min(inv.remainingDue, availableCredit));
          inv.allocatedFromReceipts = CurrencyPrecision.round(inv.allocatedFromReceipts + toAllocate);
          inv.remainingDue = CurrencyPrecision.round(inv.remainingDue - toAllocate);
          availableCredit = CurrencyPrecision.round(availableCredit - toAllocate);
        }
      }

      for (const inv of invoiceDues) {
        const totalPaid = CurrencyPrecision.round(inv.advancePaid + inv.allocatedFromReceipts);
        const remaining = CurrencyPrecision.round(Math.max(0, inv.total - totalPaid));
        let status = 'Pending';
        if (remaining <= 0 && inv.total > 0) {
          status = 'Paid';
        } else if (totalPaid > 0) {
          status = 'Partially Paid';
        }
        allocationResultMap.set(inv.id, { paid: totalPaid, remaining, status });
      }
    });

    return allocationResultMap;
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

      return {
        id: inv.custom_id || inv._id.toString(),
        invoice_number: inv.invoice_number,
        customer_id: inv.customer_id ? inv.customer_id.toString() : '',
        customer_name: inv.customer_name,
        service: inv.service || (inv.items?.[0]?.description ?? inv.category ?? 'General'),
        invoice_date: inv.issue_date,
        due_date: inv.due_date,
        lead_owner: inv.lead_owner || inv.lead_by,
        subtotal: inv.subtotal,
        vat: inv.vat,
        total: inv.grand_total,
        advance_paid: inv.advance_paid || 0,
        paid,
        remaining,
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
    data: Array<{
      invoiceId: string;
      customerName: string;
      invoiceDate: string;
      dueDate: string;
      total: number;
      paid: number;
      outstanding: number;
      daysOverdue: number;
      status: string;
    }>;
    summary: {
      totalOutstanding: number;
      totalInvoices: number;
      overdueCount: number;
    };
  }> {
    const companyObjectId =
      companyId && Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : undefined;
    const queryCompany: Record<string, any> = companyObjectId ? { companyId: companyObjectId } : {};

    const [stdInvoices, travelInvoices, allocationMap] = await Promise.all([
      InvoiceModel.find({
        ...queryCompany,
        status: { $nin: ['Cancelled', 'cancelled', 'Void', 'void'] },
      })
        .sort({ issue_date: 1, createdAt: 1 })
        .lean()
        .exec(),
      TravelInvoiceModel.find(queryCompany)
        .sort({ createdAt: 1 })
        .lean()
        .exec(),
      this.computeFifoAllocationsForInvoices(companyId),
    ]);

    const list: Array<{
      invoiceId: string;
      customerName: string;
      invoiceDate: string;
      dueDate: string;
      total: number;
      paid: number;
      outstanding: number;
      daysOverdue: number;
      status: string;
    }> = [];

    const now = Date.now();

    for (const inv of stdInvoices) {
      const total = CurrencyPrecision.round(inv.grand_total || 0);
      const allocation = allocationMap.get(inv._id.toString()) || {
        paid: CurrencyPrecision.round(inv.paid_amount || 0),
        remaining: CurrencyPrecision.round(inv.balance_amount || 0),
        status: inv.status || 'Pending',
      };
      const paid = allocation.paid;
      const outstanding = allocation.remaining;
      if (outstanding <= 0) continue;

      const dueDateStr = inv.due_date || inv.issue_date || '';
      const dueTimestamp = dueDateStr ? new Date(dueDateStr).getTime() : now;
      const diffDays = Math.ceil((now - dueTimestamp) / (1000 * 60 * 60 * 24));
      const daysOverdue = Math.max(0, diffDays);
      const status = daysOverdue > 0 ? 'Overdue' : 'Due Soon';

      list.push({
        invoiceId: inv.invoice_number || inv.custom_id || inv._id.toString(),
        customerName: inv.customer_name || 'Customer',
        invoiceDate: inv.issue_date || '',
        dueDate: dueDateStr,
        total,
        paid,
        outstanding,
        daysOverdue,
        status,
      });
    }

    for (const trInv of travelInvoices) {
      const total = CurrencyPrecision.round(trInv.amount || 0);
      const allocation = allocationMap.get(trInv._id.toString());
      const paid = allocation
        ? allocation.paid
        : CurrencyPrecision.round(
            (trInv.payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
          );
      const outstanding = allocation
        ? allocation.remaining
        : CurrencyPrecision.round(Math.max(0, total - paid));
      if (outstanding <= 0) continue;

      const dueDateStr = trInv.dueDate ? new Date(trInv.dueDate).toISOString().split('T')[0] : '';
      const dueTimestamp = trInv.dueDate ? new Date(trInv.dueDate).getTime() : now;
      const diffDays = Math.ceil((now - dueTimestamp) / (1000 * 60 * 60 * 24));
      const daysOverdue = Math.max(0, diffDays);
      const status = daysOverdue > 0 ? 'Overdue' : 'Due Soon';

      list.push({
        invoiceId: trInv.invoiceNumber || trInv._id.toString(),
        customerName: (trInv as any).customerName || 'Travel Client',
        invoiceDate: trInv.createdAt ? new Date(trInv.createdAt).toISOString().split('T')[0] : '',
        dueDate: dueDateStr,
        total,
        paid,
        outstanding,
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
      paid_amount:
        data.paid_amount ??
        (data as any).paidAmount ??
        (data as any).advance_amount ??
        (data as any).advanceAmount ??
        (data as any).advance ??
        existing.paid_amount,
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

    const updatePayload: Partial<IInvoice> = {
      ...mergedData,
      customer_id:
        mergedData.customer_id && Types.ObjectId.isValid(mergedData.customer_id)
          ? new Types.ObjectId(mergedData.customer_id)
          : existing.customer_id,
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
        financials.advance_paid !== undefined ? financials.advance_paid : existing.advance_paid || 0,
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
    allocation?: { paid: number; remaining: number; status: string },
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
      total_profit: invoice.total_profit,
      advance_paid: invoice.advance_paid || 0,
      paid_amount: paid,
      paid,
      balance_amount: remaining,
      remaining,
      created_at: invoice.createdAt ? invoice.createdAt.toISOString() : new Date().toISOString(),
      updated_at: invoice.updatedAt ? invoice.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}
