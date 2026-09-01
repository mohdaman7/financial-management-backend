import { Schema, model, Document, Types } from 'mongoose';

export interface IFAQ {
  q?: string;
  a?: string;
  question?: string;
  answer?: string;
}

export interface IRequiredStep {
  step: string;
  description: string;
}

export interface IFormLink {
  name?: string;
  label?: string;
  url: string;
}

export interface IService extends Document {
  companyId?: Types.ObjectId | null;
  name: string;
  serviceName?: string; // alias
  category: string;
  sub_category?: string;
  subCategory?: string;
  icon?: string;
  description?: string;
  government_department?: string;
  governmentDepartment?: string;
  country: string;
  required_documents: string[];
  requiredDocuments?: string[];
  eligibility?: string;
  processing_time?: string;
  processingTime?: string;
  government_fee: number;
  governmentFees?: number;
  company_service_charge: number;
  companyServiceCharge?: number;
  total_cost: number;
  price?: number;
  currency: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'active' | 'inactive' | 'coming_soon';
  approval_required: boolean;
  tags: string[];
  faqs: IFAQ[];
  internal_notes?: string;
  customer_notes?: string;
  required_steps: IRequiredStep[];
  stepsToApply?: string[];
  documents_checklist: string[];
  downloadable_forms: IFormLink[];
  official_links: IFormLink[];
  version: number;
  created_by?: string;
  updated_by?: string;
  termsAndConditions?: string;
  importantNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  created_at?: string;
  updated_at?: string;
}

const ServiceSchema = new Schema<IService>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
    name: { type: String, required: true, trim: true },
    serviceName: { type: String, trim: true },
    category: { type: String, required: true, trim: true },
    sub_category: { type: String, trim: true, default: '' },
    subCategory: { type: String, trim: true },
    icon: { type: String, default: 'Globe' },
    description: { type: String, trim: true, default: '' },
    government_department: { type: String, trim: true, default: '' },
    governmentDepartment: { type: String, trim: true },
    country: { type: String, default: 'United Arab Emirates', trim: true },
    required_documents: [{ type: String, trim: true }],
    requiredDocuments: [{ type: String, trim: true }],
    eligibility: { type: String, trim: true, default: '' },
    processing_time: { type: String, trim: true, default: '' },
    processingTime: { type: String, trim: true },
    government_fee: { type: Number, default: 0, min: 0 },
    governmentFees: { type: Number, default: 0, min: 0 },
    company_service_charge: { type: Number, default: 0, min: 0 },
    companyServiceCharge: { type: Number, default: 0, min: 0 },
    total_cost: { type: Number, default: 0, min: 0 },
    price: { type: Number, min: 0 },
    currency: { type: String, default: 'AED', uppercase: true, trim: true },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'coming_soon'],
      default: 'active',
    },
    approval_required: { type: Boolean, default: false },
    tags: [{ type: String, trim: true }],
    faqs: [
      {
        q: { type: String, trim: true },
        a: { type: String, trim: true },
        question: { type: String, trim: true },
        answer: { type: String, trim: true },
      },
    ],
    internal_notes: { type: String, trim: true, default: '' },
    customer_notes: { type: String, trim: true, default: '' },
    required_steps: [
      {
        step: { type: String, trim: true },
        description: { type: String, trim: true },
      },
    ],
    stepsToApply: [{ type: String, trim: true }],
    documents_checklist: [{ type: String, trim: true }],
    downloadable_forms: [
      {
        name: { type: String, trim: true },
        label: { type: String, trim: true },
        url: { type: String, trim: true },
      },
    ],
    official_links: [
      {
        name: { type: String, trim: true },
        label: { type: String, trim: true },
        url: { type: String, trim: true },
      },
    ],
    version: { type: Number, default: 1 },
    created_by: { type: String, default: null },
    updated_by: { type: String, default: null },
    termsAndConditions: { type: String, trim: true, default: '' },
    importantNotes: { type: String, trim: true, default: '' },
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

ServiceSchema.index({ companyId: 1, name: 1 });
ServiceSchema.index({ name: 'text', category: 'text', description: 'text', government_department: 'text' });

export const ServiceModel = model<IService>('Service', ServiceSchema);

