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
  bookingId?: Types.ObjectId | null;
  customerId?: Types.ObjectId | string | null;
  quoteRef: string;
  date: string;
  paymentTerms: string;
  customerName: string;
  contactName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  passengerName?: string;
  subject: string;
  items: IQuotationLineItem[];
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  totalPrice?: number; // legacy alias
  title?: string; // legacy alias
  details?: string; // legacy alias
  amountInWords?: string;
  createdBy?: string;
  notes?: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'approved' | 'rejected' | string;
  invoiceId?: Types.ObjectId | string | null;
  createdAt: Date;
  updatedAt: Date;
  created_at?: string;
  updated_at?: string;
}

const QuotationLineItemSchema = new Schema<IQuotationLineItem>(
  {
    description: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, default: 1, min: 1 },
    rate: { type: Number, required: true, min: 0 },
    tax: { type: Number, default: 5, min: 0 },
    amount: { type: Number, default: 0 },
  },
  {
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret: any) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        return ret;
      },
    },
  },
);

const TravelProposalSchema = new Schema<ITravelProposal>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
    bookingId: { type: Schema.Types.ObjectId, ref: 'TravelBooking', default: null },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    quoteRef: { type: String, trim: true, default: '' },
    date: { type: String, trim: true, default: () => new Date().toISOString().split('T')[0] },
    paymentTerms: { type: String, trim: true, default: '50% ADVANCE' },
    customerName: { type: String, trim: true, default: 'Valued Customer' },
    contactName: { type: String, trim: true, default: '' },
    customerPhone: { type: String, trim: true, default: '' },
    customerEmail: { type: String, trim: true, default: '' },
    customerAddress: { type: String, trim: true, default: '' },
    passengerName: { type: String, trim: true, default: '' },
    subject: { type: String, trim: true, default: 'Quotation Proposal' },
    items: [QuotationLineItemSchema],
    subtotal: { type: Number, required: true, default: 0, min: 0 },
    totalTax: { type: Number, required: true, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, default: 0, min: 0 },
    totalPrice: { type: Number, min: 0 }, // legacy alias
    title: { type: String, trim: true }, // legacy alias
    details: { type: String, trim: true, default: '' },
    amountInWords: { type: String, trim: true, default: '' },
    createdBy: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['draft', 'sent', 'accepted', 'declined', 'approved', 'rejected'],
      default: 'draft',
    },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'TravelInvoice', default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret: any) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        ret.created_at = ret.createdAt ? ret.createdAt.toISOString() : undefined;
        ret.updated_at = ret.updatedAt ? ret.updatedAt.toISOString() : undefined;
        if (!ret.quoteRef && ret.title) ret.quoteRef = ret.title;
        if (!ret.grandTotal && ret.totalPrice) ret.grandTotal = ret.totalPrice;
        if (!ret.totalPrice && ret.grandTotal) ret.totalPrice = ret.grandTotal;
        if (!ret.title && ret.quoteRef) ret.title = ret.quoteRef;
        return ret;
      },
    },
  },
);

TravelProposalSchema.index({ companyId: 1, status: 1 });
TravelProposalSchema.index({ quoteRef: 1 });
TravelProposalSchema.index({ customerName: 'text', subject: 'text', quoteRef: 'text' });

export const TravelProposalModel = model<ITravelProposal>('TravelProposal', TravelProposalSchema);
export const ProposalModel = TravelProposalModel;
