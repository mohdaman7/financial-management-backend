import { Schema, model, Document, Types } from 'mongoose';

export interface ITransaction extends Document {
  companyId: Types.ObjectId;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  taxAmount: number;
  date: Date;
  paymentMethod: 'cash' | 'bank_transfer' | 'card' | 'other';
  status: 'pending' | 'completed' | 'cancelled';
  reference?: string;
  description?: string;
  bankAccountId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'card', 'other'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'completed',
    },
    reference: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    bankAccountId: { type: Schema.Types.ObjectId, ref: 'BankAccount', default: null },
  },
  {
    timestamps: true,
  },
);

TransactionSchema.index({ companyId: 1, date: -1 });
TransactionSchema.index({ companyId: 1, type: 1 });

export const TransactionModel = model<ITransaction>('Transaction', TransactionSchema);
