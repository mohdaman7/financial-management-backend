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
  bankAccountId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Bank Account ID')
    .optional(),
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
  bankAccountId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Bank Account ID')
    .optional(),
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

export const createBankAccountSchema = z.object({
  bankName: z.string().min(2, 'Bank name is required'),
  accountName: z.string().min(2, 'Account name is required'),
  accountNumber: z.string().min(2, 'Account number is required'),
  currentBalance: z.number().optional(),
  currency: z.string().optional(),
});

export const updateBankAccountSchema = z.object({
  bankName: z.string().min(2).optional(),
  accountName: z.string().min(2).optional(),
  accountNumber: z.string().min(2).optional(),
  currentBalance: z.number().optional(),
  currency: z.string().optional(),
});
