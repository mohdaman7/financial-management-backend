import { ServiceModel, IService } from '../models/Service.model';
import { Types } from 'mongoose';

export interface ServiceFilterParams {
  category?: string;
  sub_category?: string;
  status?: string;
  priority?: string;
  search?: string;
  companyId?: string;
  page?: number;
  limit?: number;
}

export class ServiceRepository {
  async findById(id: string): Promise<IService | null> {
    if (!Types.ObjectId.isValid(id)) {
      return ServiceModel.findOne({ id }).exec();
    }
    return ServiceModel.findById(id).exec();
  }

  async findByCompany(companyId?: string): Promise<IService[]> {
    if (!companyId) {
      return ServiceModel.find().sort({ createdAt: -1 }).exec();
    }
    return ServiceModel.find({
      $or: [{ companyId: new Types.ObjectId(companyId) }, { companyId: null }],
    })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByServiceName(companyId: string | undefined, name: string, category?: string): Promise<IService | null> {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const query: any = {
      $or: [{ name: new RegExp(`^${escapedName}$`, 'i') }, { serviceName: new RegExp(`^${escapedName}$`, 'i') }],
    };
    if (category) {
      query.category = category;
    }
    if (companyId) {
      query.$and = [{ $or: [{ companyId: new Types.ObjectId(companyId) }, { companyId: null }] }];
    }
    return ServiceModel.findOne(query).exec();
  }

  async findAll(
    params: ServiceFilterParams,
  ): Promise<{ services: IService[]; total: number; page: number; limit: number }> {
    const { category, sub_category, status, priority, search, companyId, page = 1, limit = 100 } = params;
    const query: any = {};

    if (category) {
      query.category = category;
    }
    if (sub_category) {
      query.$or = [
        { sub_category: sub_category },
        { subCategory: sub_category },
      ];
    }
    if (status) {
      query.status = status;
    }
    if (priority) {
      query.priority = priority;
    }
    if (companyId) {
      query.$or = [{ companyId: new Types.ObjectId(companyId) }, { companyId: null }];
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const searchConditions = [
        { name: searchRegex },
        { serviceName: searchRegex },
        { description: searchRegex },
        { government_department: searchRegex },
        { governmentDepartment: searchRegex },
        { sub_category: searchRegex },
        { subCategory: searchRegex },
        { tags: searchRegex },
      ];
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: searchConditions }
        ];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const skip = (Math.max(1, page) - 1) * limit;
    const [services, total] = await Promise.all([
      ServiceModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      ServiceModel.countDocuments(query).exec(),
    ]);

    return {
      services,
      total,
      page: Number(page),
      limit: Number(limit),
    };
  }

  async create(data: Partial<IService>): Promise<IService> {
    const service = new ServiceModel(data);
    return service.save();
  }

  async update(id: string, data: Partial<IService>): Promise<IService | null> {
    const filter = Types.ObjectId.isValid(id) ? { _id: id } : { id };
    return ServiceModel.findOneAndUpdate(filter, data, { returnDocument: 'after' }).exec();
  }

  async delete(id: string): Promise<IService | null> {
    const filter = Types.ObjectId.isValid(id) ? { _id: id } : { id };
    return ServiceModel.findOneAndDelete(filter).exec();
  }
}
