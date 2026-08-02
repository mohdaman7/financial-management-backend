import { Schema, model, Document, Types } from 'mongoose';

export interface INotification extends Document {
  companyId: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    isRead: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

NotificationSchema.index({ userId: 1, isRead: 1 });

export const NotificationModel = model<INotification>('Notification', NotificationSchema);
