import { Schema, model, Document, Types } from 'mongoose';

export interface ITravelPayment {
  amount: number;
  date: Date;
  paymentMethod: 'cash' | 'bank_transfer' | 'card' | 'other';
}

export interface ITravelInvoice extends Document {
  companyId: Types.ObjectId;
  bookingId: Types.ObjectId;
  invoiceNumber: string;
  amount: number;
  dueDate: Date;
  status: 'unpaid' | 'paid' | 'overdue';
  payments: ITravelPayment[];
  createdAt: Date;
  updatedAt: Date;
}

const TravelInvoiceSchema = new Schema<ITravelInvoice>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'TravelBooking', required: true },
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['unpaid', 'paid', 'overdue'],
      default: 'unpaid',
    },
    payments: [
      {
        amount: { type: Number, required: true, min: 0 },
        date: { type: Date, required: true, default: Date.now },
        paymentMethod: {
          type: String,
          enum: ['cash', 'bank_transfer', 'card', 'other'],
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

TravelInvoiceSchema.index({ companyId: 1, status: 1 });

export const TravelInvoiceModel = model<ITravelInvoice>('TravelInvoice', TravelInvoiceSchema);
