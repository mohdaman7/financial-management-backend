import { z } from 'zod';

export const createEmployeeSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  roleId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Role ID format'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  department: z.string().min(2, 'Department is required'),
  position: z.string().min(2, 'Position is required'),
  phone: z.string().optional(),
  hireDate: z
    .string()
    .transform((val) => new Date(val))
    .optional(),
});

export const updateEmployeeSchema = z.object({
  firstName: z.string().min(2, 'First name is required').optional(),
  lastName: z.string().min(2, 'Last name is required').optional(),
  department: z.string().min(2, 'Department is required').optional(),
  position: z.string().min(2, 'Position is required').optional(),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});
