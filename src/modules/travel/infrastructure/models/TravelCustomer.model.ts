import { Schema, model, Document, Types } from 'mongoose';

export interface ITravelCustomer extends Document {
  companyId: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  passportNumber?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const TravelCustomerSchema = new Schema<ITravelCustomer>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    passportNumber: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  {
    timestamps: true,
  },
);

TravelCustomerSchema.index({ companyId: 1, email: 1 }, { unique: true });

export const TravelCustomerModel = model<ITravelCustomer>('TravelCustomer', TravelCustomerSchema);
