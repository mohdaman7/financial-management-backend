import { Schema, model, Document, Types } from 'mongoose';

export interface ICustomer extends Document {
  companyId: Types.ObjectId;
  name: string;
  phone?: string;
  email: string;
  address?: string;
  country?: string;
  nationality?: string;
  passportDetails?: {
    passportNumber?: string;
    expiryDate?: Date;
  };
  notes?: string;
  assignedEmployee?: Types.ObjectId;
  status:
    | 'new_lead'
    | 'contacted'
    | 'follow_up'
    | 'processing'
    | 'waiting_for_documents'
    | 'payment_pending'
    | 'completed'
    | 'cancelled';
  documents: Types.ObjectId[]; // References to GridFS files
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, required: true, lowercase: true, trim: true },
    address: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    nationality: { type: String, trim: true, default: '' },
    passportDetails: {
      passportNumber: { type: String, trim: true, default: '' },
      expiryDate: { type: Date },
    },
    notes: { type: String, trim: true, default: '' },
    assignedEmployee: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type: String,
      enum: [
        'new_lead',
        'contacted',
        'follow_up',
        'processing',
        'waiting_for_documents',
        'payment_pending',
        'completed',
        'cancelled',
      ],
      default: 'new_lead',
    },
    documents: [{ type: Schema.Types.ObjectId }],
  },
  {
    timestamps: true,
  },
);

CustomerSchema.index({ companyId: 1, email: 1 }, { unique: true });
CustomerSchema.index({ assignedEmployee: 1 });
CustomerSchema.index({ name: 'text', email: 'text', phone: 'text' });

export const CustomerModel = model<ICustomer>('Customer', CustomerSchema);
