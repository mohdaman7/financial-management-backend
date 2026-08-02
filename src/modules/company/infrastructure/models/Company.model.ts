import { Schema, model, Document } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  code: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  {
    timestamps: true,
  },
);

export const CompanyModel = model<ICompany>('Company', CompanySchema);
