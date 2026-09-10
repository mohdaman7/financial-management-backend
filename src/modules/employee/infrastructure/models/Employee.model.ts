import { Schema, model, Document, Types } from 'mongoose';

export interface IEmployee extends Document {
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  phone?: string;
  whatsapp?: string;
  nationality?: string;
  hireDate: Date;
  status: 'active' | 'inactive' | 'on_leave';
  assigned_services: string[];
  notes?: string;
  stats: {
    customers: number;
    services_processed: number;
    revenue: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    department: { type: String, default: '', trim: true },
    position: { type: String, default: '', trim: true },
    phone: { type: String, trim: true, default: '' },
    whatsapp: { type: String, trim: true, default: '' },
    nationality: { type: String, trim: true, default: '' },
    hireDate: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: ['active', 'inactive', 'on_leave'], default: 'active' },
    assigned_services: { type: [String], default: [] },
    notes: { type: String, trim: true, default: '' },
    stats: {
      customers: { type: Number, default: 0 },
      services_processed: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  },
);

EmployeeSchema.index({ companyId: 1 });

export const EmployeeModel = model<IEmployee>('Employee', EmployeeSchema);
