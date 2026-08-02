import { Schema, model, Document, Types } from 'mongoose';

export interface IAttendance extends Document {
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
  date: string; // YYYY-MM-DD format
  clockIn: Date;
  clockOut?: Date;
  workingHours?: number;
  isLate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    date: { type: String, required: true },
    clockIn: { type: Date, required: true },
    clockOut: { type: Date },
    workingHours: { type: Number, default: 0 },
    isLate: { type: Boolean, required: true, default: false },
  },
  {
    timestamps: true,
  },
);

// Enforce single attendance record per user per day
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ companyId: 1, date: 1 });

export const AttendanceModel = model<IAttendance>('Attendance', AttendanceSchema);
