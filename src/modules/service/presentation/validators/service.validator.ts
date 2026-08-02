import { z } from 'zod';

export const createServiceSchema = z.object({
  serviceName: z.string().min(2, 'Service name is required'),
  category: z.string().min(2, 'Category is required'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  price: z.number().nonnegative('Price cannot be negative'),
  processingTime: z.string().min(1, 'Processing time is required'),
  requiredDocuments: z.array(z.string()).optional(),
  termsAndConditions: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  governmentFees: z.number().nonnegative().optional(),
  companyServiceCharge: z.number().nonnegative().optional(),
  stepsToApply: z.array(z.string()).optional(),
  faqs: z
    .array(
      z.object({
        question: z.string().min(2),
        answer: z.string().min(2),
      }),
    )
    .optional(),
  importantNotes: z.string().optional(),
});

export const updateServiceSchema = z.object({
  serviceName: z.string().min(2).optional(),
  category: z.string().min(2).optional(),
  description: z.string().min(5).optional(),
  price: z.number().nonnegative().optional(),
  processingTime: z.string().min(1).optional(),
  requiredDocuments: z.array(z.string()).optional(),
  termsAndConditions: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  governmentFees: z.number().nonnegative().optional(),
  companyServiceCharge: z.number().nonnegative().optional(),
  stepsToApply: z.array(z.string()).optional(),
  faqs: z
    .array(
      z.object({
        question: z.string().min(2),
        answer: z.string().min(2),
      }),
    )
    .optional(),
  importantNotes: z.string().optional(),
});
