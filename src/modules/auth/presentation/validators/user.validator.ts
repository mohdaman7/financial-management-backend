import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  isSuperAdmin: z.boolean().optional(),
  companyId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Company ID format')
    .optional(),
  roleId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Role ID format')
    .optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  roleId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Role ID format')
    .optional(),
  status: z.enum(['active', 'inactive']).optional(),
});
