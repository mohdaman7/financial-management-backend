import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  isSuperAdmin: boolean;
  companyId?: Types.ObjectId; // Null for Super Admins unless viewing a specific company
  roleId?: Types.ObjectId; // Reference to their role
  status: 'active' | 'inactive';
  refreshToken?: string;
  currentCompanyId?: Types.ObjectId; // For Super Admins switching company dashboard context
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    isSuperAdmin: { type: Boolean, default: false },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    refreshToken: { type: String, default: null },
    currentCompanyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
  },
  {
    timestamps: true,
  },
);

export const UserModel = model<IUser>('User', UserSchema);
