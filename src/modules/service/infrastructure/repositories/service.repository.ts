import { ServiceModel, IService } from '../models/Service.model';
import { Types } from 'mongoose';

export class ServiceRepository {
  async findById(id: string): Promise<IService | null> {
    return ServiceModel.findById(id).exec();
  }

  async findByCompany(companyId: string): Promise<IService[]> {
    return ServiceModel.find({ companyId: new Types.ObjectId(companyId) }).exec();
  }

  async findByServiceName(companyId: string, name: string): Promise<IService | null> {
    return ServiceModel.findOne({
      companyId: new Types.ObjectId(companyId),
      serviceName: name,
    }).exec();
  }

  async create(data: Partial<IService>): Promise<IService> {
    const service = new ServiceModel(data);
    return service.save();
  }

  async update(id: string, data: Partial<IService>): Promise<IService | null> {
    return ServiceModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<IService | null> {
    return ServiceModel.findByIdAndDelete(id).exec();
  }
}
