import { Schema, model, Document, Types } from 'mongoose';

export interface IQuotationLineItem {
  id?: string;
  description: string;
  qty: number;
  rate: number;
  tax: number; // e.g. 5
  amount?: number;
}

export interface ITravelProposal extends Document {
  companyId?: Types.ObjectId;
  custom_id?: string;
  bookingId?: Types.ObjectId | null;
  customerId?: Types.ObjectId | string | null;
  quoteRef: string;
  quote_ref?: string;
  date: string;
  paymentTerms: string;
  payment_terms?: string;
  customerName: string;
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
  subject: string;
  items: IQuotationLineItem[];
  subtotal: number;
  discount_amount?: number;
  discountAmount?: number;
  totalTax: number;
  total_tax?: number;
  grandTotal: number;
  grand_total?: number;
  paid_amount?: number;
  paidAmount?: number;
  balance_amount?: number;
  balanceAmount?: number;
  totalPrice?: number; // legacy alias
  title?: string; // legacy alias
  details?: string; // legacy alias
  amountInWords?: string;
  amount_in_words?: string;
  createdBy?: string;
  created_by?: string;
  notes?: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired' | 'approved' | 'rejected' | string;
  invoiceId?: Types.ObjectId | string | null;
  createdAt: Date;
  updatedAt: Date;
  created_at?: string;
  updated_at?: string;
}

export type IQuotation = ITravelProposal;

const QuotationLineItemSchema = new Schema<IQuotationLineItem>(
  {
    id: { type: String },
    description: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, default: 1, min: 1 },
    rate: { type: Number, required: true, min: 0 },
    tax: { type: Number, default: 5, min: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false },
);

const TravelProposalSchema = new Schema<ITravelProposal>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
    custom_id: { type: String },
    bookingId: { type: Schema.Types.ObjectId, ref: 'TravelBooking', default: null },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    quoteRef: { type: String, trim: true, default: '' },
    date: { type: String, trim: true, default: () => new Date().toISOString().split('T')[0] },
    paymentTerms: { type: String, trim: true, default: 'CASH' },
    customerName: { type: String, trim: true, default: '' },
    contactName: { type: String, trim: true, default: '' },
    customerPhone: { type: String, trim: true, default: '' },
    customerEmail: { type: String, trim: true, default: '' },
    customerAddress: { type: String, trim: true, default: '' },
    passengerName: { type: String, trim: true, default: '' },
    subject: { type: String, trim: true, default: 'Quotation Proposal' },
    items: [QuotationLineItemSchema],
    subtotal: { type: Number, required: true, default: 0, min: 0 },
    discount_amount: { type: Number, default: 0, min: 0 },
    totalTax: { type: Number, required: true, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, default: 0, min: 0 },
    paid_amount: { type: Number, default: 0, min: 0 },
    balance_amount: { type: Number, default: 0 },
    totalPrice: { type: Number, min: 0 }, // legacy alias
    title: { type: String, trim: true }, // legacy alias
    details: { type: String, trim: true, default: '' },
    amountInWords: { type: String, trim: true, default: '' },
    createdBy: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['draft', 'sent', 'accepted', 'declined', 'expired', 'approved', 'rejected'],
      default: 'draft',
    },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'TravelInvoice', default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret: any) {
        ret.id = ret.custom_id || (ret._id ? ret._id.toString() : ret.id);
        ret.quote_ref = ret.quoteRef || ret.title || '';
        ret.payment_terms = ret.paymentTerms;
        ret.customer_name = ret.customerName;
        ret.contact_name = ret.contactName;
        ret.customer_phone = ret.customerPhone;
        ret.customer_email = ret.customerEmail;
        ret.customer_address = ret.customerAddress;
        ret.passenger_name = ret.passengerName;
        ret.created_by = ret.createdBy;
        ret.discount_amount = ret.discount_amount ?? 0;
        ret.total_tax = ret.totalTax ?? 0;
        ret.grand_total = ret.grandTotal ?? ret.totalPrice ?? 0;
        ret.paid_amount = ret.paid_amount ?? 0;
        ret.balance_amount = ret.balance_amount ?? ret.grandTotal ?? 0;
        ret.amount_in_words = ret.amountInWords;
        ret.created_at = ret.createdAt ? ret.createdAt.toISOString() : undefined;
        ret.updated_at = ret.updatedAt ? ret.updatedAt.toISOString() : undefined;
        return ret;
      },
    },
  },
);

TravelProposalSchema.index({ companyId: 1, status: 1 });
TravelProposalSchema.index({ quoteRef: 1 });
TravelProposalSchema.index({ custom_id: 1 });
TravelProposalSchema.index({ customerName: 'text', subject: 'text', quoteRef: 'text' });

export const TravelProposalModel = model<ITravelProposal>('TravelProposal', TravelProposalSchema);
export const ProposalModel = TravelProposalModel;
export const QuotationModel = TravelProposalModel;
