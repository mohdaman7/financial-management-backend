import { Schema, model, Document, Types } from 'mongoose';

export interface IBankAccount extends Document {
  companyId: Types.ObjectId;
  bankName: string;
  accountName: string;
  accountNumber: string;
  currentBalance: number;
  currency: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const BankAccountSchema = new Schema<IBankAccount>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    bankName: { type: String, required: true, trim: true },
    accountName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    currentBalance: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true, default: 'AED', uppercase: true, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  {
    timestamps: true,
  },
);

BankAccountSchema.index({ companyId: 1, accountNumber: 1 }, { unique: true });

export const BankAccountModel = model<IBankAccount>('BankAccount', BankAccountSchema);
