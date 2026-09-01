import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  name?: string;
  email: string;
  passwordHash: string;
  isSuperAdmin: boolean;
  role?: 'super_admin' | 'admin' | 'employee';
  avatar_color?: string;
  avatar_initials?: string;
  companyId?: Types.ObjectId; // Null for Super Admins unless viewing a specific company
  roleId?: Types.ObjectId; // Reference to their role
  status: 'active' | 'inactive';
  refreshToken?: string;
  currentCompanyId?: Types.ObjectId; // For Super Admins switching company dashboard context
  last_login?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    isSuperAdmin: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'employee'],
      default: function (this: IUser) {
        return this.isSuperAdmin ? 'super_admin' : 'employee';
      },
    },
    avatar_color: { type: String, default: 'bg-blue-600' },
    avatar_initials: { type: String },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    refreshToken: { type: String, default: null },
    currentCompanyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
    last_login: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

export const UserModel = model<IUser>('User', UserSchema);
