import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['super_admin', 'admin', 'employee']).optional(),
});

export const refreshSchema = z
  .object({
    refreshToken: z.string().optional(),
    refresh_token: z.string().optional(),
  })
  .refine((data) => !!(data.refreshToken || data.refresh_token), {
    message: 'refresh_token or refreshToken is required',
  });

export const logoutSchema = z
  .object({
    refreshToken: z.string().optional(),
    refresh_token: z.string().optional(),
  })
  .optional();

export const switchCompanySchema = z.object({
  companyId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Company ID format'),
});

