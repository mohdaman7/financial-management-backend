import { Schema, model, Document, Types } from 'mongoose';

export interface ICandidateBio {
  dob?: string;
  gender?: string;
  nationality?: string;
  passport_number: string;
  passport_issue_date?: string;
  passport_expiry_date?: string;
  passport_place_of_issue?: string;
  permanent_home_address?: string;
}

export interface IOfferLetter extends Document {
  companyId?: Types.ObjectId;
  custom_id?: string;
  reference_no: string;
  company_name: string;
  company_email?: string;
  employee_full_name: string;
  position: string;
  offer_date: string;
  join_by_date: string;
  monthly_salary_amount: number;
  probation_period: string;
  monthly_salary_formatted: string;
  place_of_employment: string;
  working_hours_standard: string;
  candidate_bio: ICandidateBio;
  status: 'Issued' | 'Accepted' | 'Revoked' | string;
  created_by?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CandidateBioSchema = new Schema<ICandidateBio>(
  {
    dob: { type: String, default: '' },
    gender: { type: String, default: 'MALE' },
    nationality: { type: String, default: '' },
    passport_number: { type: String, required: true, trim: true },
    passport_issue_date: { type: String, default: '' },
    passport_expiry_date: { type: String, default: '' },
    passport_place_of_issue: { type: String, default: '' },
    permanent_home_address: { type: String, default: '' },
  },
  { _id: false },
);

const OfferLetterSchema = new Schema<IOfferLetter>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
    custom_id: { type: String, index: true },
    reference_no: { type: String, required: true, index: true },
    company_name: { type: String, required: true, trim: true },
    company_email: { type: String, default: '' },
    employee_full_name: { type: String, required: true, trim: true },
    position: { type: String, required: true, trim: true },
    offer_date: { type: String, required: true },
    join_by_date: { type: String, required: true },
    monthly_salary_amount: { type: Number, required: true, min: 0 },
    probation_period: { type: String, default: '3 MONTHS' },
    monthly_salary_formatted: { type: String, required: true },
    place_of_employment: { type: String, default: 'DUBAI, UNITED ARAB EMIRATES.' },
    working_hours_standard: {
      type: String,
      default: 'AS PER COMPANY POLICY AND UAE LABOUR LAW',
    },
    candidate_bio: { type: CandidateBioSchema, required: true },
    status: {
      type: String,
      enum: ['Issued', 'Accepted', 'Revoked'],
      default: 'Issued',
    },
    created_by: { type: String, default: 'System' },
  },
  {
    timestamps: true,
  },
);

OfferLetterSchema.index({ companyId: 1, reference_no: 1 });
OfferLetterSchema.index({ companyId: 1, employee_full_name: 1 });
OfferLetterSchema.index({ companyId: 1, status: 1 });

export const OfferLetterModel = model<IOfferLetter>('OfferLetter', OfferLetterSchema);
