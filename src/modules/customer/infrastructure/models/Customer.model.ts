import { Schema, model, Document, Types } from 'mongoose';

export interface ICustomerDocument {
  id?: string;
  name: string;
  type:
    'Passport' | 'Corporate License' | 'Visa Document' | 'Service Application' | 'Other' | string;
  file_url: string;
  fileId?: Types.ObjectId | string;
  size_bytes?: number;
  status: 'pending' | 'verified' | 'rejected' | string;
  uploaded_at: Date;
}

export interface ICustomerActivityLog {
  id?: string;
  action: string;
  description: string;
  performed_by: string;
  timestamp: Date;
}

export interface ICustomer extends Document {
  companyId?: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  passport_number?: string;
  passport_expiry?: string;
  nationality?: string;
  country?: string;
  company_name?: string;
  assigned_employee_id?: Types.ObjectId | string;
  assigned_agent?: string;
  lead_source?:
    | 'walk_in'
    | 'referral'
    | 'social_media'
    | 'google'
    | 'whatsapp'
    | 'phone'
    | 'email'
    | 'partner'
    | 'other'
    | string;
  status: 'lead' | 'active' | 'vip' | 'inactive' | 'blocked' | string;
  priority: 'low' | 'normal' | 'high' | 'urgent' | string;
  current_service?: string;
  tags: string[];
  notes?: string;
  internal_notes?: string;
  total_spent: number;
  created_by?: string;
  documents: ICustomerDocument[];
  activity_log: ICustomerActivityLog[];
  // Legacy compatibility fields
  address?: string;
  passportDetails?: {
    passportNumber?: string;
    expiryDate?: Date;
  };
  assignedEmployee?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  created_at?: string;
  updated_at?: string;
}

const CustomerDocumentSchema = new Schema<ICustomerDocument>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['Passport', 'Corporate License', 'Visa Document', 'Service Application', 'Other'],
      default: 'Other',
    },
    file_url: { type: String, required: true },
    fileId: { type: Schema.Types.ObjectId, default: null },
    size_bytes: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    uploaded_at: { type: Date, default: Date.now },
  },
  {
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret: any) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        return ret;
      },
    },
  },
);

const CustomerActivityLogSchema = new Schema<ICustomerActivityLog>(
  {
    action: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    performed_by: { type: String, required: true, trim: true },
    timestamp: { type: Date, default: Date.now },
  },
  {
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret: any) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        return ret;
      },
    },
  },
);

const CustomerSchema = new Schema<ICustomer>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    whatsapp: { type: String, trim: true, default: '' },
    passport_number: { type: String, trim: true, default: '' },
    passport_expiry: { type: String, trim: true, default: '' },
    nationality: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    company_name: { type: String, trim: true, default: '' },
    assigned_employee_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    assigned_agent: { type: String, trim: true, default: '' },
    lead_source: {
      type: String,
      enum: [
        'walk_in',
        'referral',
        'social_media',
        'google',
        'whatsapp',
        'phone',
        'email',
        'partner',
        'other',
      ],
      default: 'other',
    },
    status: {
      type: String,
      enum: [
        'lead',
        'active',
        'vip',
        'inactive',
        'blocked',
        'new_lead',
        'contacted',
        'follow_up',
        'processing',
        'waiting_for_documents',
        'payment_pending',
        'completed',
        'cancelled',
      ],
      default: 'lead',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    current_service: { type: String, trim: true, default: '' },
    tags: [{ type: String, trim: true }],
    notes: { type: String, trim: true, default: '' },
    internal_notes: { type: String, trim: true, default: '' },
    total_spent: { type: Number, default: 0, min: 0 },
    created_by: { type: String, trim: true, default: '' },
    documents: [CustomerDocumentSchema],
    activity_log: [CustomerActivityLogSchema],
    // Legacy fields for backward compatibility
    address: { type: String, trim: true, default: '' },
    passportDetails: {
      passportNumber: { type: String, trim: true, default: '' },
      expiryDate: { type: Date },
    },
    assignedEmployee: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret: any) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        ret.created_at = ret.createdAt ? ret.createdAt.toISOString() : undefined;
        ret.updated_at = ret.updatedAt ? ret.updatedAt.toISOString() : undefined;
        if (ret.documents && Array.isArray(ret.documents)) {
          ret.documents = ret.documents.map((d: any) => {
            if (d._id && !d.id) d.id = d._id.toString();
            return d;
          });
        }
        if (ret.activity_log && Array.isArray(ret.activity_log)) {
          ret.activity_log = ret.activity_log.map((a: any) => {
            if (a._id && !a.id) a.id = a._id.toString();
            return a;
          });
        }
        return ret;
      },
    },
  },
);

CustomerSchema.index({ companyId: 1, email: 1 });
CustomerSchema.index({ companyId: 1, status: 1 });
CustomerSchema.index({ companyId: 1, priority: 1 });
CustomerSchema.index({ assigned_employee_id: 1 });
CustomerSchema.index({ name: 'text', email: 'text', phone: 'text', company_name: 'text' });

export const CustomerModel = model<ICustomer>('Customer', CustomerSchema);
