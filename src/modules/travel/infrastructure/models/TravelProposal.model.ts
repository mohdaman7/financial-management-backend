import { Schema, model, Document, Types } from 'mongoose';

export interface ITravelProposal extends Document {
  companyId: Types.ObjectId;
  bookingId: Types.ObjectId;
  title: string;
  totalPrice: number;
  details?: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const TravelProposalSchema = new Schema<ITravelProposal>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'TravelBooking', required: true },
    title: { type: String, required: true, trim: true },
    totalPrice: { type: Number, required: true, min: 0 },
    details: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['draft', 'sent', 'approved', 'rejected'],
      default: 'draft',
    },
  },
  {
    timestamps: true,
  },
);

TravelProposalSchema.index({ companyId: 1, status: 1 });

export const TravelProposalModel = model<ITravelProposal>('TravelProposal', TravelProposalSchema);
