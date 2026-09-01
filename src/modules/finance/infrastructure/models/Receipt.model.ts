import { Schema, model, Document, Types } from 'mongoose';

export interface IReceiptAllocation {
  invoice_id: string;
  allocated_amount: number;
  remaining_invoice_balance: number;
}

export interface IReceipt extends Document {
  companyId?: Types.ObjectId;
  invoiceId?: Types.ObjectId | string | null;
  customerId?: Types.ObjectId | string | null;
  reference: string;
  customerName: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Card' | 'Online Payment' | 'Cheque' | string;
  amount: number;
  currency: string;
  date: string;
  bank_account?: string;
  transaction_reference?: string;
  notes?: string;
  received_by?: string;
  status: 'Received' | 'Pending' | 'Cancelled' | string;
  allocations: IReceiptAllocation[];
  createdAt: Date;
  updatedAt: Date;
  created_at?: string;
  updated_at?: string;
}

const ReceiptAllocationSchema = new Schema<IReceiptAllocation>(
  {
    invoice_id: { type: String, required: true },
    allocated_amount: { type: Number, required: true, min: 0 },
    remaining_invoice_balance: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const ReceiptSchema = new Schema<IReceipt>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'TravelInvoice', default: null },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    reference: { type: String, required: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'Card', 'Online Payment', 'Cheque'],
      required: true,
      default: 'Bank Transfer',
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'AED', uppercase: true, trim: true },
    date: { type: String, required: true, default: () => new Date().toISOString().split('T')[0] },
    bank_account: { type: String, trim: true, default: 'Main Bank Account' },
    transaction_reference: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    received_by: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['Received', 'Pending', 'Cancelled'],
      default: 'Received',
    },
    allocations: [ReceiptAllocationSchema],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret: any) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        ret.created_at = ret.createdAt ? ret.createdAt.toISOString() : undefined;
        ret.updated_at = ret.updatedAt ? ret.updatedAt.toISOString() : undefined;
        return ret;
      },
    },
  },
);

ReceiptSchema.index({ companyId: 1, date: -1 });
ReceiptSchema.index({ reference: 1 });
ReceiptSchema.index({ customerName: 'text', reference: 'text', transaction_reference: 'text' });

export const ReceiptModel = model<IReceipt>('Receipt', ReceiptSchema);
