import { Schema, model, Document, Types } from 'mongoose';

export interface ITravelBooking extends Document {
  companyId: Types.ObjectId;
  customerId: Types.ObjectId;
  status: 'draft' | 'quoted' | 'confirmed' | 'cancelled';
  visaDetails?: {
    status: 'pending' | 'approved' | 'rejected';
    country: string;
    visaType: string;
    expiryDate?: Date;
  };
  flightDetails?: {
    ticketNumber: string;
    airline: string;
    departure: string;
    destination: string;
    departureTime?: Date;
  };
  hotelDetails?: {
    hotelName: string;
    roomType: string;
    checkIn?: Date;
    checkOut?: Date;
  };
  insuranceDetails?: {
    policyNumber: string;
    provider: string;
    coverageAmount?: number;
  };
  packageDetails?: {
    packageName: string;
    durationDays?: number;
    price?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TravelBookingSchema = new Schema<ITravelBooking>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    status: {
      type: String,
      enum: ['draft', 'quoted', 'confirmed', 'cancelled'],
      default: 'draft',
    },
    visaDetails: {
      status: { type: String, enum: ['pending', 'approved', 'rejected'] },
      country: { type: String, trim: true },
      visaType: { type: String, trim: true },
      expiryDate: { type: Date },
    },
    flightDetails: {
      ticketNumber: { type: String, trim: true },
      airline: { type: String, trim: true },
      departure: { type: String, trim: true },
      destination: { type: String, trim: true },
      departureTime: { type: Date },
    },
    hotelDetails: {
      hotelName: { type: String, trim: true },
      roomType: { type: String, trim: true },
      checkIn: { type: Date },
      checkOut: { type: Date },
    },
    insuranceDetails: {
      policyNumber: { type: String, trim: true },
      provider: { type: String, trim: true },
      coverageAmount: { type: Number, default: 0 },
    },
    packageDetails: {
      packageName: { type: String, trim: true },
      durationDays: { type: Number },
      price: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  },
);

TravelBookingSchema.index({ companyId: 1, status: 1 });
TravelBookingSchema.index({ customerId: 1 });

export const TravelBookingModel = model<ITravelBooking>('TravelBooking', TravelBookingSchema);
