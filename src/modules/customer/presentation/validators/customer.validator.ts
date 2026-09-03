import { z } from 'zod';

export const customerLedgerQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in YYYY-MM-DD format').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be in YYYY-MM-DD format').optional(),
  type: z.enum(['invoice', 'receipt', 'all']).optional(),
  page: z.preprocess((val) => (val !== undefined ? parseInt(String(val), 10) : 1), z.number().min(1).default(1)),
  limit: z.preprocess((val) => (val !== undefined ? parseInt(String(val), 10) : 50), z.number().min(1).max(100).default(50)),
});

export const allocateCreditSchema = z.object({
  invoiceId: z.string().optional(),
  invoiceRef: z.string().optional(),
  allocatedAmount: z.number().positive('allocatedAmount must be greater than 0'),
  notes: z.string().optional(),
}).refine((data) => Boolean(data.invoiceId || data.invoiceRef), {
  message: 'Either invoiceId or invoiceRef must be provided',
  path: ['invoiceId'],
});

export type CustomerLedgerQueryDTO = z.infer<typeof customerLedgerQuerySchema>;
export type AllocateCreditDTO = z.infer<typeof allocateCreditSchema>;
