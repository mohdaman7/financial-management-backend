import { Schema, model, Document, Types } from 'mongoose';

export interface IEmployee extends Document {
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  phone?: string;
  hireDate: Date;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    position: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    hireDate: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  {
    timestamps: true,
  },
);

EmployeeSchema.index({ companyId: 1 });

export const EmployeeModel = model<IEmployee>('Employee', EmployeeSchema);
