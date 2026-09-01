import { Types } from 'mongoose';
import { OfferLetterModel, IOfferLetter } from '../models/OfferLetter.model';

export interface OfferLetterFilters {
  status?: string;
  search?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export class OfferLetterRepository {
  async findFiltered(
    companyId?: string,
    filters: OfferLetterFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 },
  ): Promise<{
    offerLetters: IOfferLetter[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const query: any = {};

    if (companyId && Types.ObjectId.isValid(companyId)) {
      query.$or = [
        { companyId: new Types.ObjectId(companyId) },
        { companyId: null },
        { companyId: { $exists: false } },
      ];
    }

    if (filters.status && filters.status !== 'all') {
      query.status = { $regex: new RegExp(`^${filters.status.trim()}$`, 'i') };
    }

    if (filters.search && filters.search.trim()) {
      const s = filters.search.trim();
      const searchRegex = { $regex: s, $options: 'i' };
      const searchConditions: any[] = [
        { reference_no: searchRegex },
        { custom_id: searchRegex },
        { employee_full_name: searchRegex },
        { position: searchRegex },
        { company_name: searchRegex },
        { 'candidate_bio.passport_number': searchRegex },
        { 'candidate_bio.nationality': searchRegex },
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const page = Math.max(1, pagination.page || 1);
    const limit = Math.max(1, Math.min(100, pagination.limit || 20));
    const skip = (page - 1) * limit;

    const [offerLetters, total] = await Promise.all([
      OfferLetterModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      OfferLetterModel.countDocuments(query).exec(),
    ]);

    const total_pages = Math.ceil(total / limit) || 1;

    return {
      offerLetters,
      total,
      page,
      limit,
      total_pages,
    };
  }

  async findById(id: string): Promise<IOfferLetter | null> {
    if (!id) return null;

    // 1. Direct custom_id or reference_no match
    let letter = await OfferLetterModel.findOne({
      $or: [{ custom_id: id }, { reference_no: id }],
    }).exec();

    if (letter) return letter;

    // 2. If valid MongoDB ObjectId
    if (Types.ObjectId.isValid(id)) {
      letter = await OfferLetterModel.findById(id).exec();
    }

    return letter;
  }

  async create(data: Partial<IOfferLetter>): Promise<IOfferLetter> {
    const letter = new OfferLetterModel(data);
    return letter.save();
  }

  async update(id: string, data: Partial<IOfferLetter>): Promise<IOfferLetter | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    Object.assign(existing, data);
    return existing.save();
  }

  async delete(id: string): Promise<IOfferLetter | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    return OfferLetterModel.findByIdAndDelete(existing._id).exec();
  }

  async count(companyId?: string): Promise<number> {
    const query: any = {};
    if (companyId && Types.ObjectId.isValid(companyId)) {
      query.companyId = new Types.ObjectId(companyId);
    }
    return OfferLetterModel.countDocuments(query).exec();
  }
}
