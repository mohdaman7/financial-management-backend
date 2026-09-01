import { Types } from 'mongoose';
import {
  TravelProposalModel,
  ITravelProposal,
  IQuotationLineItem,
} from '../../infrastructure/models/TravelProposal.model';
import { TravelInvoiceModel } from '../../infrastructure/models/TravelInvoice.model';
import { AppError } from '@shared/errors/AppError';
import { EmailService } from '@shared/services/email.service';
import { PdfGenerator } from '@shared/utils/pdfGenerator';

export interface CreateProposalDTO {
  date?: string;
  paymentTerms?: string;
  customerId?: string;
  bookingId?: string;
  customerName: string;
  contactName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  passengerName?: string;
  subject: string;
  items?: IQuotationLineItem[];
  subtotal?: number;
  totalTax?: number;
  grandTotal?: number;
  totalPrice?: number;
  title?: string;
  amountInWords?: string;
  notes?: string;
  status?: 'draft' | 'sent' | 'accepted' | 'declined' | 'approved' | 'rejected' | string;
}

export class ProposalService {
  constructor(private emailService: EmailService) {}

  async listProposals(
    companyId?: string,
    filters: { status?: string; start_date?: string; end_date?: string; search?: string } = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 20 },
  ): Promise<{ proposals: ITravelProposal[]; meta: { total: number; page: number; limit: number } }> {
    const query: any = {};

    if (companyId && Types.ObjectId.isValid(companyId)) {
      query.$or = [{ companyId: new Types.ObjectId(companyId) }, { companyId: null }];
    }

    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
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
        { customerName: { $regex: s, $options: 'i' } },
        { quoteRef: { $regex: s, $options: 'i' } },
        { title: { $regex: s, $options: 'i' } },
        { subject: { $regex: s, $options: 'i' } },
        { contactName: { $regex: s, $options: 'i' } },
      ];
    }

    const page = Math.max(1, pagination.page || 1);
    const limit = Math.max(1, Math.min(100, pagination.limit || 20));
    const skip = (page - 1) * limit;

    const [proposals, total] = await Promise.all([
      TravelProposalModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      TravelProposalModel.countDocuments(query).exec(),
    ]);

    return { proposals, meta: { total, page, limit } };
  }

  async getProposalById(id: string): Promise<ITravelProposal> {
    if (!Types.ObjectId.isValid(id)) {
      throw AppError.notFound('Proposal not found');
    }
    const proposal = await TravelProposalModel.findById(id).exec();
    if (!proposal) {
      throw AppError.notFound('Proposal not found');
    }
    return proposal;
  }

  async createProposal(
    companyId: string | undefined,
    data: CreateProposalDTO,
    createdBy = 'System',
  ): Promise<ITravelProposal> {
    // Generate auto quote reference SQ-YYYY-XXXX if not provided
    const year = new Date().getFullYear();
    const count = await TravelProposalModel.countDocuments();
    const quoteRef = `SQ-${year}-${String(count + 1).padStart(4, '0')}`;

    let subtotal = data.subtotal || 0;
    let totalTax = data.totalTax || 0;
    let grandTotal = data.grandTotal || data.totalPrice || 0;

    const items = Array.isArray(data.items) && data.items.length > 0 ? data.items : [];

    if (items.length > 0 && (!grandTotal || grandTotal === 0)) {
      subtotal = items.reduce((acc, item) => acc + item.rate * item.qty, 0);
      totalTax = items.reduce((acc, item) => acc + (item.rate * item.qty * (item.tax || 5)) / 100, 0);
      grandTotal = subtotal + totalTax;
    } else if (grandTotal > 0 && (!subtotal || subtotal === 0)) {
      subtotal = Math.round((grandTotal / 1.05) * 100) / 100;
      totalTax = Math.round((grandTotal - subtotal) * 100) / 100;
    }

    const proposal = new TravelProposalModel({
      companyId: companyId && Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : undefined,
      bookingId: data.bookingId && Types.ObjectId.isValid(data.bookingId) ? new Types.ObjectId(data.bookingId) : undefined,
      customerId: data.customerId && Types.ObjectId.isValid(data.customerId) ? new Types.ObjectId(data.customerId) : undefined,
      quoteRef,
      title: quoteRef,
      date: data.date || new Date().toISOString().split('T')[0],
      paymentTerms: data.paymentTerms || '50% ADVANCE',
      customerName: data.customerName,
      contactName: data.contactName || data.customerName,
      customerPhone: data.customerPhone || '',
      customerEmail: data.customerEmail || '',
      customerAddress: data.customerAddress || '',
      passengerName: data.passengerName || data.customerName,
      subject: data.subject || data.title || 'Quotation Proposal',
      items,
      subtotal,
      totalTax,
      grandTotal,
      totalPrice: grandTotal,
      amountInWords: data.amountInWords || `AED ${grandTotal.toFixed(2)}`,
      notes: data.notes || '',
      createdBy,
      status: data.status || 'draft',
    });

    return proposal.save();
  }

  async updateProposal(id: string, data: Partial<CreateProposalDTO>): Promise<ITravelProposal> {
    const proposal = await this.getProposalById(id);

    if (data.items && Array.isArray(data.items)) {
      proposal.items = data.items;
      proposal.subtotal = data.items.reduce((acc, item) => acc + item.rate * item.qty, 0);
      proposal.totalTax = data.items.reduce(
        (acc, item) => acc + (item.rate * item.qty * (item.tax || 5)) / 100,
        0,
      );
      proposal.grandTotal = proposal.subtotal + proposal.totalTax;
      proposal.totalPrice = proposal.grandTotal;
    }

    if (data.status) proposal.status = data.status;
    if (data.notes) proposal.notes = data.notes;
    if (data.paymentTerms) proposal.paymentTerms = data.paymentTerms;
    if (data.subject) proposal.subject = data.subject;
    if (data.customerName) proposal.customerName = data.customerName;
    if (data.customerEmail) proposal.customerEmail = data.customerEmail;
    if (data.customerPhone) proposal.customerPhone = data.customerPhone;
    if (data.amountInWords) proposal.amountInWords = data.amountInWords;

    return proposal.save();
  }

  async deleteProposal(id: string): Promise<void> {
    await this.getProposalById(id);
    await TravelProposalModel.findByIdAndDelete(id).exec();
  }

  async sendProposalEmail(
    id: string,
    recipientEmail: string,
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
    const filename = `Proposal_${proposal.quoteRef || proposal._id}.pdf`;

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
      paymentTerms: proposal.paymentTerms || '50% ADVANCE',
      items: proposal.items || [],
      subtotal: proposal.subtotal || 0,
      totalTax: proposal.totalTax || 0,
      grandTotal: proposal.grandTotal || proposal.totalPrice || 0,
      amountInWords: proposal.amountInWords,
      notes: proposal.notes,
    });

    return { buffer, filename };
  }

  async convertToInvoice(id: string, companyId?: string): Promise<any> {
    const proposal = await this.getProposalById(id);

    const year = new Date().getFullYear();
    const count = await TravelInvoiceModel.countDocuments();
    const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, '0')}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14); // 14 days payment term

    const invoice = await TravelInvoiceModel.create({
      companyId:
        companyId && Types.ObjectId.isValid(companyId)
          ? new Types.ObjectId(companyId)
          : proposal.companyId || undefined,
      bookingId: proposal.bookingId || new Types.ObjectId(),
      invoiceNumber,
      amount: proposal.grandTotal || proposal.totalPrice || 0,
      dueDate,
      status: 'unpaid',
      payments: [],
    });

    proposal.status = 'accepted';
    proposal.invoiceId = invoice._id;
    await proposal.save();

    return {
      invoice_id: invoice._id.toString(),
      invoice_number: invoice.invoiceNumber,
      proposal_id: proposal._id.toString(),
      grandTotal: invoice.amount,
      status: 'unpaid',
      created_at: invoice.createdAt.toISOString(),
    };
  }
}
