import { Schema, model, Document, Types } from 'mongoose';

export interface IRole extends Document {
  name: string;
  description: string;
  permissions: string[];
  companyId?: Types.ObjectId; // Optional: Null means global role, otherwise company-scoped
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    permissions: { type: [String], default: [] },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
  },
  {
    timestamps: true,
  },
);

// Ensure role name is unique per company (or globally unique if companyId is null)
RoleSchema.index({ name: 1, companyId: 1 }, { unique: true });

export const RoleModel = model<IRole>('Role', RoleSchema);
