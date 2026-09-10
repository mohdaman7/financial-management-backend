import { z } from 'zod';

export const createLeadOwnerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  status: z.enum(['Active', 'Inactive']).optional(),
});

export const updateLeadOwnerSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  status: z.enum(['Active', 'Inactive']).optional(),
});
