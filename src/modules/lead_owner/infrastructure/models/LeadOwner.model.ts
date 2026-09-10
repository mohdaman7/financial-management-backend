import mongoose, { Document, Schema } from 'mongoose';

export interface ILeadOwner extends Document {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'Active' | 'Inactive';
  company_id: string;
  created_at: Date;
  updated_at: Date;
}

const leadOwnerSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    company_id: { type: String, required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

// Indexes
leadOwnerSchema.index({ company_id: 1 });
leadOwnerSchema.index({ id: 1 }, { unique: true });

export const LeadOwner = mongoose.model<ILeadOwner>('LeadOwner', leadOwnerSchema);
