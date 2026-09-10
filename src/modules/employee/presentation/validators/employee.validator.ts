import { z } from 'zod';

export const createEmployeeSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  roleId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Role ID format').optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  department: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  nationality: z.string().optional(),
  assigned_services: z.array(z.string()).optional(),
  notes: z.string().optional(),
  hireDate: z
    .string()
    .transform((val) => new Date(val))
    .optional(),
});

export const updateEmployeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  nationality: z.string().optional(),
  assigned_services: z.array(z.string()).optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive', 'on_leave']).optional(),
});
