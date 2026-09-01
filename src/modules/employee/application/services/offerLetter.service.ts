import { Types } from 'mongoose';
import {
  OfferLetterRepository,
  OfferLetterFilters,
  PaginationOptions,
} from '../../infrastructure/repositories/offerLetter.repository';
import { IOfferLetter, ICandidateBio } from '../../infrastructure/models/OfferLetter.model';
import { AppError } from '@shared/errors/AppError';
import { formatSalaryLegalWording } from '@shared/utils/numberToWords';
import { PdfGenerator } from '@shared/utils/pdfGenerator';

export interface CreateOfferLetterDTO {
  company_name: string;
  company_email?: string;
  employee_full_name: string;
  position: string;
  offer_date?: string;
  join_by_date?: string;
  monthly_salary_amount: number;
  probation_period?: string;
  monthly_salary_formatted?: string;
  place_of_employment?: string;
  working_hours_standard?: string;
  dob?: string;
  gender?: string;
  nationality?: string;
  passport_number: string;
  passport_issue_date?: string;
  passport_expiry_date?: string;
  passport_place_of_issue?: string;
  permanent_home_address?: string;
  status?: string;
}

export interface ExportOfferLetterPdfOptions {
  format?: 'pdf' | 'png';
  include_company_stamp?: boolean;
  watermark?: boolean;
}

export class OfferLetterService {
  constructor(private offerLetterRepository: OfferLetterRepository) {}

  async createOfferLetter(
    companyId: string | undefined,
    data: CreateOfferLetterDTO,
    createdBy = 'System',
  ): Promise<any> {
    if (!data.company_name || !data.company_name.trim()) {
      throw AppError.badRequest(
        "Field 'company_name' is mandatory for generating an offer letter.",
        'MISSING_REQUIRED_FIELD',
      );
    }

    if (!data.employee_full_name || !data.employee_full_name.trim()) {
      throw AppError.badRequest(
        "Field 'employee_full_name' is mandatory for generating an offer letter.",
        'MISSING_REQUIRED_FIELD',
      );
    }

    if (!data.passport_number || !data.passport_number.trim()) {
      throw AppError.badRequest(
        "Field 'passport_number' is mandatory for generating an offer letter.",
        'MISSING_REQUIRED_FIELD',
      );
    }

    if (data.monthly_salary_amount === undefined || data.monthly_salary_amount <= 0) {
      throw AppError.unprocessable(
        'Monthly salary amount must be positive.',
        'INVALID_SALARY_AMOUNT',
      );
    }

    const year = new Date().getFullYear();
    const count = await this.offerLetterRepository.count(companyId);
    const seq = count + 1;
    const referenceNo = `OL/${year}/${seq}`;
    const customId = `ol-${year}-${String(seq).padStart(4, '0')}`;

    const salaryFormatted =
      data.monthly_salary_formatted && data.monthly_salary_formatted.trim()
        ? data.monthly_salary_formatted.trim()
        : formatSalaryLegalWording(Number(data.monthly_salary_amount));

    const candidateBio: ICandidateBio = {
      dob: data.dob || '',
      gender: (data.gender || 'Male').toUpperCase(),
      nationality: (data.nationality || '').toUpperCase(),
      passport_number: data.passport_number.trim().toUpperCase(),
      passport_issue_date: data.passport_issue_date || '',
      passport_expiry_date: data.passport_expiry_date || '',
      passport_place_of_issue: (data.passport_place_of_issue || '').toUpperCase(),
      permanent_home_address: data.permanent_home_address || '',
    };

    const offerLetter = await this.offerLetterRepository.create({
      companyId:
        companyId && Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : undefined,
      custom_id: customId,
      reference_no: referenceNo,
      company_name: data.company_name.trim(),
      company_email: data.company_email || '',
      employee_full_name: data.employee_full_name.trim(),
      position: data.position ? data.position.trim().toUpperCase() : 'OFFICER',
      offer_date: data.offer_date || new Date().toISOString().split('T')[0],
      join_by_date: data.join_by_date || new Date().toISOString().split('T')[0],
      monthly_salary_amount: Number(data.monthly_salary_amount),
      probation_period: data.probation_period || '3 MONTHS',
      monthly_salary_formatted: salaryFormatted,
      place_of_employment: data.place_of_employment || 'DUBAI, UNITED ARAB EMIRATES.',
      working_hours_standard:
        data.working_hours_standard || 'AS PER COMPANY POLICY AND UAE LABOUR LAW',
      candidate_bio: candidateBio,
      status: data.status || 'Issued',
      created_by: createdBy,
    });

    return this.formatOfferLetterDetail(offerLetter);
  }

  async listOfferLetters(
    companyId?: string,
    filters: OfferLetterFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 },
  ): Promise<{
    data: any[];
    meta: { total_records: number; page: number; limit: number; total_pages: number };
  }> {
    const { offerLetters, total, page, limit, total_pages } =
      await this.offerLetterRepository.findFiltered(companyId, filters, pagination);

    const formattedList = offerLetters.map((ol) => this.formatOfferLetterDetail(ol));

    return {
      data: formattedList,
      meta: {
        total_records: total,
        page,
        limit,
        total_pages,
      },
    };
  }

  async getOfferLetterById(id: string): Promise<any> {
    const offerLetter = await this.offerLetterRepository.findById(id);
    if (!offerLetter) {
      throw AppError.notFound(`Offer letter with ID '${id}' not found`, 'OFFER_LETTER_NOT_FOUND');
    }
    return this.formatOfferLetterDetail(offerLetter);
  }

  async updateOfferLetter(id: string, data: Partial<CreateOfferLetterDTO>): Promise<any> {
    const existing = await this.offerLetterRepository.findById(id);
    if (!existing) {
      throw AppError.notFound(`Offer letter with ID '${id}' not found`, 'OFFER_LETTER_NOT_FOUND');
    }

    if (data.monthly_salary_amount !== undefined && data.monthly_salary_amount <= 0) {
      throw AppError.unprocessable(
        'Monthly salary amount must be positive.',
        'INVALID_SALARY_AMOUNT',
      );
    }

    let salaryFormatted = existing.monthly_salary_formatted;
    if (data.monthly_salary_formatted) {
      salaryFormatted = data.monthly_salary_formatted;
    } else if (data.monthly_salary_amount !== undefined) {
      salaryFormatted = formatSalaryLegalWording(Number(data.monthly_salary_amount));
    }

    const mergedBio: ICandidateBio = {
      dob: data.dob ?? existing.candidate_bio.dob,
      gender: data.gender ? data.gender.toUpperCase() : existing.candidate_bio.gender,
      nationality: data.nationality
        ? data.nationality.toUpperCase()
        : existing.candidate_bio.nationality,
      passport_number: data.passport_number
        ? data.passport_number.trim().toUpperCase()
        : existing.candidate_bio.passport_number,
      passport_issue_date: data.passport_issue_date ?? existing.candidate_bio.passport_issue_date,
      passport_expiry_date:
        data.passport_expiry_date ?? existing.candidate_bio.passport_expiry_date,
      passport_place_of_issue: data.passport_place_of_issue
        ? data.passport_place_of_issue.toUpperCase()
        : existing.candidate_bio.passport_place_of_issue,
      permanent_home_address:
        data.permanent_home_address ?? existing.candidate_bio.permanent_home_address,
    };

    const updatePayload: Partial<IOfferLetter> = {
      company_name: data.company_name ?? existing.company_name,
      company_email: data.company_email ?? existing.company_email,
      employee_full_name: data.employee_full_name ?? existing.employee_full_name,
      position: data.position ? data.position.toUpperCase() : existing.position,
      offer_date: data.offer_date ?? existing.offer_date,
      join_by_date: data.join_by_date ?? existing.join_by_date,
      monthly_salary_amount:
        data.monthly_salary_amount !== undefined
          ? Number(data.monthly_salary_amount)
          : existing.monthly_salary_amount,
      probation_period: data.probation_period ?? existing.probation_period,
      monthly_salary_formatted: salaryFormatted,
      place_of_employment: data.place_of_employment ?? existing.place_of_employment,
      working_hours_standard: data.working_hours_standard ?? existing.working_hours_standard,
      candidate_bio: mergedBio,
      status: data.status ?? existing.status,
    };

    const updated = await this.offerLetterRepository.update(id, updatePayload);
    if (!updated) {
      throw AppError.notFound(`Offer letter with ID '${id}' not found`, 'OFFER_LETTER_NOT_FOUND');
    }

    return this.formatOfferLetterDetail(updated);
  }

  async deleteOfferLetter(id: string): Promise<void> {
    const existing = await this.offerLetterRepository.findById(id);
    if (!existing) {
      throw AppError.notFound(`Offer letter with ID '${id}' not found`, 'OFFER_LETTER_NOT_FOUND');
    }

    await this.offerLetterRepository.delete(id);
  }

  async exportPdf(
    id: string,
    options: ExportOfferLetterPdfOptions = {},
  ): Promise<{ buffer: Buffer; filename: string }> {
    const offerLetter = await this.offerLetterRepository.findById(id);
    if (!offerLetter) {
      throw AppError.notFound(`Offer letter with ID '${id}' not found`, 'OFFER_LETTER_NOT_FOUND');
    }

    const safeName = offerLetter.employee_full_name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    const filename = `OFFER_LETTER_${safeName}.pdf`;

    const buffer = PdfGenerator.generateOfferLetterPdf({
      reference_no: offerLetter.reference_no,
      company_name: offerLetter.company_name,
      company_email: offerLetter.company_email,
      employee_full_name: offerLetter.employee_full_name,
      position: offerLetter.position,
      offer_date: offerLetter.offer_date,
      join_by_date: offerLetter.join_by_date,
      monthly_salary_amount: offerLetter.monthly_salary_amount,
      probation_period: offerLetter.probation_period,
      monthly_salary_formatted: offerLetter.monthly_salary_formatted,
      place_of_employment: offerLetter.place_of_employment,
      working_hours_standard: offerLetter.working_hours_standard,
      candidate_bio: offerLetter.candidate_bio,
      status: offerLetter.status,
      options,
    });

    return { buffer, filename };
  }

  private formatOfferLetterDetail(ol: IOfferLetter): any {
    return {
      id: ol.custom_id || ol._id.toString(),
      reference_no: ol.reference_no,
      company_name: ol.company_name,
      company_email: ol.company_email || '',
      employee_full_name: ol.employee_full_name,
      position: ol.position,
      offer_date: ol.offer_date,
      join_by_date: ol.join_by_date,
      monthly_salary_amount: ol.monthly_salary_amount,
      probation_period: ol.probation_period,
      monthly_salary_formatted: ol.monthly_salary_formatted,
      place_of_employment: ol.place_of_employment,
      working_hours_standard: ol.working_hours_standard,
      candidate_bio: {
        dob: ol.candidate_bio?.dob || '',
        gender: ol.candidate_bio?.gender || 'MALE',
        nationality: ol.candidate_bio?.nationality || '',
        passport_number: ol.candidate_bio?.passport_number || '',
        passport_issue_date: ol.candidate_bio?.passport_issue_date || '',
        passport_expiry_date: ol.candidate_bio?.passport_expiry_date || '',
        passport_place_of_issue: ol.candidate_bio?.passport_place_of_issue || '',
        permanent_home_address: ol.candidate_bio?.permanent_home_address || '',
      },
      status: ol.status || 'Issued',
      created_at: ol.createdAt ? ol.createdAt.toISOString() : new Date().toISOString(),
      updated_at: ol.updatedAt ? ol.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}
