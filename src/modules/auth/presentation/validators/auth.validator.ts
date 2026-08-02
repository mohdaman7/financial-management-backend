import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const switchCompanySchema = z.object({
  companyId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Company ID format'),
});
