import { z } from 'zod';

export const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  category: z.string().min(2, 'Category is required'),
  amount: z.number().positive('Amount must be positive'),
  taxAmount: z.number().nonnegative('Tax amount cannot be negative').optional(),
  date: z
    .string()
    .transform((val) => new Date(val))
    .optional(),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'card', 'other']),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  reference: z.string().optional(),
  description: z.string().optional(),
});

export const updateTransactionSchema = z.object({
  category: z.string().min(2, 'Category is required').optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  taxAmount: z.number().nonnegative('Tax amount cannot be negative').optional(),
  date: z
    .string()
    .transform((val) => new Date(val))
    .optional(),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'card', 'other']).optional(),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  reference: z.string().optional(),
  description: z.string().optional(),
});

export const reportRangeSchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
    .transform((val) => new Date(val)),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
    .transform((val) => new Date(val)),
});
