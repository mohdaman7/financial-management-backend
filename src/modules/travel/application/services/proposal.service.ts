import { Types } from 'mongoose';
import {
  TravelProposalModel,
  ITravelProposal,
  IQuotationLineItem,
} from '../../infrastructure/models/TravelProposal.model';
import { AppError } from '@shared/errors/AppError';
import { EmailService } from '@shared/services/email.service';
import { PdfGenerator } from '@shared/utils/pdfGenerator';
import { formatQuotationWords } from '@shared/utils/numberToWords';
import { CurrencyPrecision } from '@shared/utils/currencyPrecision';

export interface CreateProposalDTO {
  quote_ref?: string;
  quoteRef?: string;
  date?: string;
  payment_terms?: string;
  paymentTerms?: string;
  customerId?: string;
  customer_id?: string;
  bookingId?: string;
  customerName?: string;
  customer_name?: string;
  contactName?: string;
  contact_name?: string;
  customerPhone?: string;
  customer_phone?: string;
  customerEmail?: string;
  customer_email?: string;
  customerAddress?: string;
  customer_address?: string;
  passengerName?: string;
  passenger_name?: string;
  subject?: string;
  title?: string;
  items?: IQuotationLineItem[];
  subtotal?: number;
  discount_amount?: number;
  discountAmount?: number;
  totalTax?: number;
  total_tax?: number;
  grandTotal?: number;
  grand_total?: number;
  paid_amount?: number;
  paidAmount?: number;
  balance_amount?: number;
  balanceAmount?: number;
  totalPrice?: number;
  amountInWords?: string;
  amount_in_words?: string;
  notes?: string;
  details?: string;
  createdBy?: string;
  created_by?: string;
  status?:
    'draft' | 'sent' | 'accepted' | 'declined' | 'expired' | 'approved' | 'rejected' | string;
}

export class ProposalService {
  constructor(private emailService: EmailService) {}

  private computeFinancials(
    items: IQuotationLineItem[],
    discountAmount = 0,
    paidAmount = 0,
  ): {
    subtotal: number;
    discount_amount: number;
    total_tax: number;
    grand_total: number;
    paid_amount: number;
    balance_amount: number;
    amount_in_words: string;
  } {
    const subtotal = CurrencyPrecision.round(
      items.reduce((sum, item) => sum + (Number(item.rate) || 0) * (Number(item.qty) || 0), 0),
    );
    const clampedDiscount = CurrencyPrecision.clampDiscount(subtotal, discountAmount);
    const taxableAmount = Math.max(0, subtotal - clampedDiscount);

    let totalTax = 0;
    if (subtotal > 0) {
      totalTax = items.reduce((sum, item) => {
        const lineTotal = (Number(item.rate) || 0) * (Number(item.qty) || 0);
        const propShare = (lineTotal / subtotal) * clampedDiscount;
        const taxRate = item.tax !== undefined ? Number(item.tax) : 5;
        return sum + CurrencyPrecision.calculateLineItemVat(lineTotal, 1, propShare, taxRate);
      }, 0);
    }

    const roundedTax = CurrencyPrecision.round(totalTax);
    const grandTotal = CurrencyPrecision.round(taxableAmount + roundedTax);
    const balanceAmount = CurrencyPrecision.round(grandTotal - (paidAmount || 0));
    const amountInWords = formatQuotationWords(grandTotal);

    return {
      subtotal,
      discount_amount: clampedDiscount,
      total_tax: roundedTax,
      grand_total: grandTotal,
      paid_amount: CurrencyPrecision.round(paidAmount || 0),
      balance_amount: balanceAmount,
      amount_in_words: amountInWords,
    };
  }

  formatQuotationDetail(q: ITravelProposal): any {
    const items = (q.items || []).map((item, index) => ({
      id: item.id || `item-${index + 1}`,
      description: item.description,
      qty: item.qty,
      rate: item.rate,
      tax: item.tax ?? 5,
      amount: item.amount ?? item.rate * item.qty,
    }));

    const rawId = q.custom_id || q._id.toString();
    const quoteRef = q.quoteRef || q.title || '';
    const grandTotal = q.grandTotal ?? q.totalPrice ?? 0;
    const subtotal = q.subtotal ?? 0;
    const totalTax = q.totalTax ?? 0;
    const discountAmount = q.discount_amount ?? q.discountAmount ?? 0;
    const paidAmount = q.paid_amount ?? q.paidAmount ?? 0;
    const balanceAmount = q.balance_amount ?? q.balanceAmount ?? grandTotal - paidAmount;

    return {
      id: rawId,
      _id: q._id.toString(),
      custom_id: q.custom_id || rawId,
      quote_ref: quoteRef,
      quoteRef,
      date: q.date,
      payment_terms: q.paymentTerms || 'CASH',
      paymentTerms: q.paymentTerms || 'CASH',
      customer_name: q.customerName,
      customerName: q.customerName,
      contact_name: q.contactName || q.customerName,
      contactName: q.contactName || q.customerName,
      customer_phone: q.customerPhone || '',
      customerPhone: q.customerPhone || '',
      customer_email: q.customerEmail || '',
      customerEmail: q.customerEmail || '',
      customer_address: q.customerAddress || '',
      customerAddress: q.customerAddress || '',
      passenger_name: q.passengerName || q.customerName,
      passengerName: q.passengerName || q.customerName,
      subject: q.subject || q.title || 'VISA & AIR TICKETING QUOTE',
      title: q.subject || q.title || 'VISA & AIR TICKETING QUOTE',
      created_by: q.createdBy || 'Skyfall International Team',
      createdBy: q.createdBy || 'Skyfall International Team',
      notes: q.notes || q.details || '',
      details: q.notes || q.details || '',
      status: q.status || 'draft',
      items,
      subtotal,
      discount_amount: discountAmount,
      discountAmount,
      total_tax: totalTax,
      totalTax,
      grand_total: grandTotal,
      grandTotal,
      totalPrice: grandTotal,
      paid_amount: paidAmount,
      paidAmount,
      balance_amount: balanceAmount,
      balanceAmount,
      amount_in_words: q.amountInWords || '',
      amountInWords: q.amountInWords || '',
      created_at: q.createdAt ? q.createdAt.toISOString() : new Date().toISOString(),
      createdAt: q.createdAt ? q.createdAt.toISOString() : new Date().toISOString(),
      updated_at: q.updatedAt ? q.updatedAt.toISOString() : new Date().toISOString(),
      updatedAt: q.updatedAt ? q.updatedAt.toISOString() : new Date().toISOString(),
    };
  }

  async listProposals(
    companyId?: string,
    filters: { status?: string; start_date?: string; end_date?: string; search?: string } = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 20 },
  ): Promise<{
    proposals: any[];
    meta: {
      total: number;
      total_records: number;
      page: number;
      limit: number;
      total_pages: number;
    };
  }> {
    const query: any = {};

    if (companyId && Types.ObjectId.isValid(companyId)) {
      query.$or = [{ companyId: new Types.ObjectId(companyId) }, { companyId: null }];
    }

    if (filters.status && filters.status !== 'all') {
      query.status = { $regex: new RegExp(`^${filters.status.trim()}$`, 'i') };
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
      const searchConditions = [
        { customerName: { $regex: s, $options: 'i' } },
        { quoteRef: { $regex: s, $options: 'i' } },
        { custom_id: { $regex: s, $options: 'i' } },
        { title: { $regex: s, $options: 'i' } },
        { subject: { $regex: s, $options: 'i' } },
        { contactName: { $regex: s, $options: 'i' } },
        { customerEmail: { $regex: s, $options: 'i' } },
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

    const [proposals, total] = await Promise.all([
      TravelProposalModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      TravelProposalModel.countDocuments(query).exec(),
    ]);

    const total_pages = Math.ceil(total / limit) || 1;
    const formatted = proposals.map((p) => this.formatQuotationDetail(p));

    return {
      proposals: formatted,
      meta: { total, total_records: total, page, limit, total_pages },
    };
  }

  async getProposalById(id: string, companyId?: string): Promise<ITravelProposal> {
    if (!id) {
      throw AppError.notFound(`Quotation '${id}' not found`, 'QUOTATION_NOT_FOUND');
    }

    const query: any = {
      $or: [{ custom_id: id }, { quoteRef: id }, { title: id }],
    };

    if (companyId && Types.ObjectId.isValid(companyId)) {
      query.companyId = { $in: [new Types.ObjectId(companyId), null] };
    }

    let proposal = await TravelProposalModel.findOne(query).exec();

    if (!proposal && Types.ObjectId.isValid(id)) {
      const byIdQuery: any = { _id: new Types.ObjectId(id) };
      if (companyId && Types.ObjectId.isValid(companyId)) {
        byIdQuery.companyId = { $in: [new Types.ObjectId(companyId), null] };
      }
      proposal = await TravelProposalModel.findOne(byIdQuery).exec();
    }

    if (!proposal) {
      throw AppError.notFound(`Quotation with ID '${id}' not found`, 'QUOTATION_NOT_FOUND');
    }
    return proposal;
  }

  async createProposal(
    companyId: string | undefined,
    data: CreateProposalDTO,
    createdBy = 'System',
  ): Promise<any> {
    const customerName = data.customer_name || data.customerName;
    if (!customerName || !customerName.trim()) {
      throw AppError.badRequest("Field 'customer_name' is mandatory.", 'MISSING_CUSTOMER_NAME');
    }

    const rawItems = data.items || [];
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw AppError.badRequest(
        'Quotation request must contain at least one item.',
        'EMPTY_LINE_ITEMS',
      );
    }

    for (const item of rawItems) {
      if (item.qty === undefined || item.qty <= 0) {
        throw AppError.unprocessable(
          'Quantity must be greater than zero.',
          'INVALID_ITEM_QUANTITY',
        );
      }
      if (item.rate === undefined || item.rate < 0) {
        throw AppError.unprocessable('Rate must be non-negative.', 'INVALID_ITEM_QUANTITY');
      }
    }

    const items: IQuotationLineItem[] = rawItems.map((item, idx) => ({
      id: item.id || `item-${idx + 1}`,
      description: item.description,
      qty: Number(item.qty),
      rate: Number(item.rate),
      tax: item.tax !== undefined ? Number(item.tax) : 5,
      amount: Number(item.rate) * Number(item.qty),
    }));

    const discountAmount = Number(data.discount_amount ?? data.discountAmount ?? 0);
    const paidAmount = Number(data.paid_amount ?? data.paidAmount ?? 0);

    const financials = this.computeFinancials(items, discountAmount, paidAmount);

    const year = new Date().getFullYear();
    const count = await TravelProposalModel.countDocuments();
    const quoteRef =
      data.quote_ref || data.quoteRef || `SQ-${year}-${String(count + 1).padStart(4, '0')}`;
    const customId = `qt-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 6)}`;

    const proposal = new TravelProposalModel({
      companyId:
        companyId && Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : undefined,
      custom_id: customId,
      bookingId:
        data.bookingId && Types.ObjectId.isValid(data.bookingId)
          ? new Types.ObjectId(data.bookingId)
          : undefined,
      customerId:
        (data.customer_id || data.customerId) &&
        Types.ObjectId.isValid(data.customer_id || (data.customerId as string))
          ? new Types.ObjectId(data.customer_id || (data.customerId as string))
          : undefined,
      quoteRef,
      title: quoteRef,
      date: data.date || new Date().toISOString().split('T')[0],
      paymentTerms: data.payment_terms || data.paymentTerms || 'CASH',
      customerName: customerName.trim(),
      contactName: data.contact_name || data.contactName || customerName.trim(),
      customerPhone: data.customer_phone || data.customerPhone || '',
      customerEmail: data.customer_email || data.customerEmail || '',
      customerAddress: data.customer_address || data.customerAddress || '',
      passengerName: data.passenger_name || data.passengerName || customerName.trim(),
      subject: data.subject || data.title || 'VISA & AIR TICKETING QUOTE',
      items,
      subtotal: financials.subtotal,
      discount_amount: financials.discount_amount,
      totalTax: financials.total_tax,
      grandTotal: financials.grand_total,
      paid_amount: financials.paid_amount,
      balance_amount: financials.balance_amount,
      totalPrice: financials.grand_total,
      amountInWords: data.amount_in_words || data.amountInWords || financials.amount_in_words,
      notes: data.notes || data.details || '',
      createdBy: data.created_by || data.createdBy || createdBy,
      status: data.status || 'draft',
    });

    const saved = await proposal.save();
    return this.formatQuotationDetail(saved);
  }

  async updateProposal(id: string, data: Partial<CreateProposalDTO>): Promise<any> {
    const proposal = await this.getProposalById(id);

    if (data.items && Array.isArray(data.items)) {
      if (data.items.length === 0) {
        throw AppError.badRequest(
          'Quotation request must contain at least one item.',
          'EMPTY_LINE_ITEMS',
        );
      }

      for (const item of data.items) {
        if (item.qty === undefined || item.qty <= 0) {
          throw AppError.unprocessable(
            'Quantity must be greater than zero.',
            'INVALID_ITEM_QUANTITY',
          );
        }
        if (item.rate === undefined || item.rate < 0) {
          throw AppError.unprocessable('Rate must be non-negative.', 'INVALID_ITEM_QUANTITY');
        }
      }

      proposal.items = data.items.map((item, idx) => ({
        id: item.id || `item-${idx + 1}`,
        description: item.description,
        qty: Number(item.qty),
        rate: Number(item.rate),
        tax: item.tax !== undefined ? Number(item.tax) : 5,
        amount: Number(item.rate) * Number(item.qty),
      }));
    }

    const discountAmount =
      data.discount_amount !== undefined
        ? Number(data.discount_amount)
        : data.discountAmount !== undefined
          ? Number(data.discountAmount)
          : (proposal.discount_amount ?? 0);

    const paidAmount =
      data.paid_amount !== undefined
        ? Number(data.paid_amount)
        : data.paidAmount !== undefined
          ? Number(data.paidAmount)
          : (proposal.paid_amount ?? 0);

    const financials = this.computeFinancials(proposal.items, discountAmount, paidAmount);

    proposal.subtotal = financials.subtotal;
    proposal.discount_amount = financials.discount_amount;
    proposal.totalTax = financials.total_tax;
    proposal.grandTotal = financials.grand_total;
    proposal.paid_amount = financials.paid_amount;
    proposal.balance_amount = financials.balance_amount;
    proposal.totalPrice = financials.grand_total;
    proposal.amountInWords = financials.amount_in_words;

    if (data.status) proposal.status = data.status;
    if (data.notes !== undefined) proposal.notes = data.notes;
    if (data.details !== undefined) proposal.details = data.details;
    if (data.payment_terms || data.paymentTerms)
      proposal.paymentTerms = data.payment_terms || (data.paymentTerms as string);
    if (data.subject || data.title) proposal.subject = data.subject || (data.title as string);
    if (data.customer_name || data.customerName)
      proposal.customerName = data.customer_name || (data.customerName as string);
    if (data.contact_name || data.contactName)
      proposal.contactName = data.contact_name || (data.contactName as string);
    if (data.customer_email || data.customerEmail)
      proposal.customerEmail = data.customer_email || (data.customerEmail as string);
    if (data.customer_phone || data.customerPhone)
      proposal.customerPhone = data.customer_phone || (data.customerPhone as string);
    if (data.customer_address || data.customerAddress)
      proposal.customerAddress = data.customer_address || (data.customerAddress as string);
    if (data.passenger_name || data.passengerName)
      proposal.passengerName = data.passenger_name || (data.passengerName as string);
    if (data.amount_in_words || data.amountInWords)
      proposal.amountInWords = data.amount_in_words || (data.amountInWords as string);

    const updated = await proposal.save();
    return this.formatQuotationDetail(updated);
  }

  async deleteProposal(id: string): Promise<void> {
    const proposal = await this.getProposalById(id);
    await TravelProposalModel.findByIdAndDelete(proposal._id).exec();
  }

  async sendProposalEmail(
    id: string,
    recipientEmail?: string,
    ccEmails?: string[],
    customMessage?: string,
  ): Promise<{ message: string }> {
    const proposal = await this.getProposalById(id);
    const targetEmail = recipientEmail || proposal.customerEmail;

    if (!targetEmail) {
      throw AppError.badRequest('Recipient email is required');
    }

    const subject = `Official Service Quotation [${proposal.quoteRef || proposal.title}] - Skyfall Travels`;
    const body =
      customMessage ||
      `Dear ${proposal.contactName || proposal.customerName},\n\nPlease find attached our official proposal quotation for ${proposal.subject}.\nTotal: AED ${proposal.grandTotal || proposal.totalPrice}\n\nSkyfall International Travels LLC`;

    await this.emailService.sendEmail(targetEmail, subject, body);

    if (proposal.status === 'draft') {
      proposal.status = 'sent';
      await proposal.save();
    }

    return {
      message: `Quotation email dispatched successfully to ${targetEmail}`,
    };
  }

  async generatePdf(id: string): Promise<{ buffer: Buffer; filename: string }> {
    const proposal = await this.getProposalById(id);
    const safeRef = (proposal.quoteRef || 'QUOTATION').replace(/[^a-zA-Z0-9]/g, '_');
    const safeCustomer = (proposal.customerName || 'CUSTOMER').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `QUOTATION_${safeRef}_${safeCustomer}.pdf`;

    const buffer = PdfGenerator.generateProposalPdf({
      quoteRef: proposal.quoteRef || proposal.title || 'SQ-2026-0001',
      date: proposal.date || proposal.createdAt.toISOString().split('T')[0],
      customerName: proposal.customerName,
      contactName: proposal.contactName,
      customerPhone: proposal.customerPhone,
      customerEmail: proposal.customerEmail,
      customerAddress: proposal.customerAddress,
      passengerName: proposal.passengerName,
      subject: proposal.subject || proposal.title || 'Service Quotation',
      paymentTerms: proposal.paymentTerms || 'CASH',
      items: proposal.items || [],
      subtotal: proposal.subtotal || 0,
      discount_amount: proposal.discount_amount || 0,
      totalTax: proposal.totalTax || 0,
      grandTotal: proposal.grandTotal || proposal.totalPrice || 0,
      paid_amount: proposal.paid_amount || 0,
      balance_amount: proposal.balance_amount || 0,
      amountInWords: proposal.amountInWords,
      notes: proposal.notes,
    });

    return { buffer, filename };
  }

  async convertToInvoice(id: string, companyId?: string): Promise<any> {
    const proposal = await this.getProposalById(id);

    proposal.status = 'accepted';
    await proposal.save();

    return {
      proposalId: proposal._id,
      proposal_id: proposal._id,
      status: proposal.status,
    };
  }
}
