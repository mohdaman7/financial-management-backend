import { z } from 'zod';

export const quotationLineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Item description is required'),
  qty: z.number().int().min(1, 'Quantity must be greater than zero.'),
  rate: z.number().min(0, 'Rate must be non-negative.'),
  tax: z.number().min(0).optional().default(5),
  amount: z.number().optional(),
});

export const createQuotationSchema = z
  .object({
    quote_ref: z.string().optional(),
    quoteRef: z.string().optional(),
    date: z.string().optional(),
    payment_terms: z.string().optional(),
    paymentTerms: z.string().optional(),
    customer_id: z.string().optional(),
    customerId: z.string().optional(),
    customer_name: z.string().optional(),
    customerName: z.string().optional(),
    contact_name: z.string().optional(),
    contactName: z.string().optional(),
    customer_phone: z.string().optional(),
    customerPhone: z.string().optional(),
    customer_email: z.string().optional(),
    customerEmail: z.string().optional(),
    customer_address: z.string().optional(),
    customerAddress: z.string().optional(),
    passenger_name: z.string().optional(),
    passengerName: z.string().optional(),
    subject: z.string().optional(),
    created_by: z.string().optional(),
    createdBy: z.string().optional(),
    notes: z.string().optional(),
    status: z
      .enum(['draft', 'sent', 'accepted', 'declined', 'expired', 'approved', 'rejected'])
      .optional()
      .default('draft'),
    items: z
      .array(quotationLineItemSchema)
      .min(1, 'Quotation request must contain at least one item.'),
    discount_amount: z.number().min(0).optional().default(0),
    discountAmount: z.number().min(0).optional(),
    paid_amount: z.number().min(0).optional().default(0),
    paidAmount: z.number().min(0).optional(),
    bookingId: z.string().optional(),
  })
  .refine((data) => !!(data.customer_name || data.customerName), {
    message: "Field 'customer_name' is mandatory.",
    path: ['customer_name'],
  });

export const updateQuotationSchema = z.object({
  quote_ref: z.string().optional(),
  quoteRef: z.string().optional(),
  date: z.string().optional(),
  payment_terms: z.string().optional(),
  paymentTerms: z.string().optional(),
  customer_id: z.string().optional(),
  customerId: z.string().optional(),
  customer_name: z.string().optional(),
  customerName: z.string().optional(),
  contact_name: z.string().optional(),
  contactName: z.string().optional(),
  customer_phone: z.string().optional(),
  customerPhone: z.string().optional(),
  customer_email: z.string().optional(),
  customerEmail: z.string().optional(),
  customer_address: z.string().optional(),
  customerAddress: z.string().optional(),
  passenger_name: z.string().optional(),
  passengerName: z.string().optional(),
  subject: z.string().optional(),
  created_by: z.string().optional(),
  createdBy: z.string().optional(),
  notes: z.string().optional(),
  status: z
    .enum(['draft', 'sent', 'accepted', 'declined', 'expired', 'approved', 'rejected'])
    .optional(),
  items: z.array(quotationLineItemSchema).optional(),
  discount_amount: z.number().min(0).optional(),
  discountAmount: z.number().min(0).optional(),
  paid_amount: z.number().min(0).optional(),
  paidAmount: z.number().min(0).optional(),
});

export const exportQuotationPdfSchema = z.object({
  format: z.enum(['pdf', 'png']).optional().default('pdf'),
  include_terms: z.boolean().optional().default(true),
});
