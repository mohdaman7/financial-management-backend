import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Customer name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  passportNumber: z.string().optional(),
  passport_number: z.string().optional(),
  passport_expiry: z.string().optional(),
  nationality: z.string().optional(),
  country: z.string().optional(),
  company_name: z.string().optional(),
  assigned_employee_id: z.string().optional(),
  assigned_agent: z.string().optional(),
  lead_source: z
    .enum([
      'walk_in',
      'referral',
      'social_media',
      'google',
      'whatsapp',
      'phone',
      'email',
      'partner',
      'other',
    ])
    .optional(),
  status: z
    .enum([
      'lead',
      'active',
      'vip',
      'inactive',
      'blocked',
      'new_lead',
      'contacted',
      'follow_up',
      'processing',
      'waiting_for_documents',
      'payment_pending',
      'completed',
      'cancelled',
    ])
    .optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  current_service: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
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
