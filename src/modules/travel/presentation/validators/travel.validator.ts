import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Customer name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  passportNumber: z.string().optional(),
});

export const createBookingSchema = z.object({
  customerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Customer ID format'),
  visaDetails: z
    .object({
      status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
      country: z.string(),
      visaType: z.string(),
      expiryDate: z
        .string()
        .transform((val) => new Date(val))
        .optional(),
    })
    .optional(),
  flightDetails: z
    .object({
      ticketNumber: z.string(),
      airline: z.string(),
      departure: z.string(),
      destination: z.string(),
      departureTime: z
        .string()
        .transform((val) => new Date(val))
        .optional(),
    })
    .optional(),
  hotelDetails: z
    .object({
      hotelName: z.string(),
      roomType: z.string(),
      checkIn: z
        .string()
        .transform((val) => new Date(val))
        .optional(),
      checkOut: z
        .string()
        .transform((val) => new Date(val))
        .optional(),
    })
    .optional(),
  insuranceDetails: z
    .object({
      policyNumber: z.string(),
      provider: z.string(),
      coverageAmount: z.number().optional(),
    })
    .optional(),
  packageDetails: z
    .object({
      packageName: z.string(),
      durationDays: z.number().optional(),
      price: z.number().optional(),
    })
    .optional(),
});

export const createProposalSchema = z.object({
  bookingId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Booking ID format'),
  title: z.string().min(2, 'Proposal title is required'),
  totalPrice: z.number().positive('Total price must be positive'),
  details: z.string().optional(),
});

export const updateProposalStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'approved', 'rejected']),
});

export const recordPaymentSchema = z.object({
  amount: z.number().positive('Payment amount must be positive'),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'card', 'other']),
});
