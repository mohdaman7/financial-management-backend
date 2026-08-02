import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  description: z.string().min(5, 'Description must be at least 5 characters').trim(),
  permissions: z.array(z.string()).default([]),
  companyId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Company ID format')
    .optional(),
});

export const updateRoleSchema = createRoleSchema.partial();
