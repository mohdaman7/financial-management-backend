import { z } from 'zod';

export const createOfferLetterSchema = z.object({
  company_name: z
    .string()
    .min(1, "Field 'company_name' is mandatory for generating an offer letter."),
  company_email: z.string().optional(),
  employee_full_name: z
    .string()
    .min(1, "Field 'employee_full_name' is mandatory for generating an offer letter."),
  position: z.string().min(1, "Field 'position' is mandatory for generating an offer letter."),
  offer_date: z.string().optional(),
  join_by_date: z.string().optional(),
  monthly_salary_amount: z.number().positive('Monthly salary amount must be positive.'),
  probation_period: z.string().optional().default('3 MONTHS'),
  monthly_salary_formatted: z.string().optional(),
  place_of_employment: z.string().optional().default('DUBAI, UNITED ARAB EMIRATES.'),
  working_hours_standard: z.string().optional().default('AS PER COMPANY POLICY AND UAE LABOUR LAW'),
  dob: z.string().optional(),
  gender: z.string().optional().default('Male'),
  nationality: z.string().optional(),
  passport_number: z
    .string()
    .min(1, "Field 'passport_number' is mandatory for generating an offer letter."),
  passport_issue_date: z.string().optional(),
  passport_expiry_date: z.string().optional(),
  passport_place_of_issue: z.string().optional(),
  permanent_home_address: z.string().optional(),
});

export const updateOfferLetterSchema = z.object({
  company_name: z.string().min(1).optional(),
  company_email: z.string().optional(),
  employee_full_name: z.string().min(1).optional(),
  position: z.string().min(1).optional(),
  offer_date: z.string().optional(),
  join_by_date: z.string().optional(),
  monthly_salary_amount: z.number().positive('Monthly salary amount must be positive.').optional(),
  probation_period: z.string().optional(),
  monthly_salary_formatted: z.string().optional(),
  place_of_employment: z.string().optional(),
  working_hours_standard: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  passport_number: z.string().min(1).optional(),
  passport_issue_date: z.string().optional(),
  passport_expiry_date: z.string().optional(),
  passport_place_of_issue: z.string().optional(),
  permanent_home_address: z.string().optional(),
  status: z.enum(['Issued', 'Accepted', 'Revoked']).optional(),
});

export const exportOfferLetterPdfSchema = z.object({
  format: z.enum(['pdf', 'png']).optional().default('pdf'),
  include_company_stamp: z.boolean().optional().default(true),
  watermark: z.boolean().optional().default(false),
});
