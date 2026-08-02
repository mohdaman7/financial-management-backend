import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  companyId?: Types.ObjectId;
  userId?: Types.ObjectId;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true, trim: true },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    details: { type: Schema.Types.Map, of: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

AuditLogSchema.index({ companyId: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1 });

export const AuditLogModel = model<IAuditLog>('AuditLog', AuditLogSchema);
