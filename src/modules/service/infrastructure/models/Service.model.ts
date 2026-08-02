import { Schema, model, Document, Types } from 'mongoose';

export interface IFAQ {
  question: string;
  answer: string;
}

export interface IService extends Document {
  companyId: Types.ObjectId;
  serviceName: string;
  category: string;
  description: string;
  price: number;
  processingTime: string;
  requiredDocuments: string[];
  termsAndConditions?: string;
  status: 'active' | 'inactive';
  governmentFees: number;
  companyServiceCharge: number;
  stepsToApply: string[];
  faqs: IFAQ[];
  importantNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IService>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    serviceName: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    processingTime: { type: String, required: true, trim: true },
    requiredDocuments: [{ type: String, trim: true }],
    termsAndConditions: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    governmentFees: { type: Number, default: 0 },
    companyServiceCharge: { type: Number, default: 0 },
    stepsToApply: [{ type: String, trim: true }],
    faqs: [
      {
        question: { type: String, required: true, trim: true },
        answer: { type: String, required: true, trim: true },
      },
    ],
    importantNotes: { type: String, trim: true, default: '' },
  },
  {
    timestamps: true,
  },
);

ServiceSchema.index({ companyId: 1, serviceName: 1 }, { unique: true });
ServiceSchema.index({ serviceName: 'text', category: 'text', description: 'text' });

export const ServiceModel = model<IService>('Service', ServiceSchema);
