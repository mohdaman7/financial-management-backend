import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters').max(100),
  code: z
    .string()
    .min(2, 'Company code must be at least 2 characters')
    .max(10)
    .regex(/^[a-zA-Z0-9]+$/, 'Company code must be alphanumeric'),
});

export const updateCompanySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters').max(100).optional(),
  code: z
    .string()
    .min(2, 'Company code must be at least 2 characters')
    .max(10)
    .regex(/^[a-zA-Z0-9]+$/, 'Company code must be alphanumeric')
    .optional(),
  status: z.enum(['active', 'inactive']).optional(),
});
