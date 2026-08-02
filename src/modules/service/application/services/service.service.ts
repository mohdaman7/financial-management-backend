import { ServiceRepository } from '../../infrastructure/repositories/service.repository';
import { IService } from '../../infrastructure/models/Service.model';
import { Types } from 'mongoose';
import { AppError } from '@shared/errors/AppError';

export class ServiceService {
  constructor(private serviceRepository: ServiceRepository) {}

  async createService(companyId: string, data: Partial<IService>): Promise<IService> {
    if (!data.serviceName) {
      throw AppError.badRequest('Service name is required');
    }

    const existing = await this.serviceRepository.findByServiceName(companyId, data.serviceName);
    if (existing) {
      throw AppError.conflict('Service with this name already exists in this company');
    }

    return this.serviceRepository.create({
      ...data,
      companyId: new Types.ObjectId(companyId),
    });
  }

  async getServiceById(id: string): Promise<IService> {
    const service = await this.serviceRepository.findById(id);
    if (!service) {
      throw AppError.notFound('Service not found');
    }
    return service;
  }

  async getServicesByCompany(companyId: string): Promise<IService[]> {
    return this.serviceRepository.findByCompany(companyId);
  }

  async updateService(id: string, data: Partial<IService>): Promise<IService> {
    const service = await this.serviceRepository.findById(id);
    if (!service) {
      throw AppError.notFound('Service not found');
    }

    const updated = await this.serviceRepository.update(id, data);
    if (!updated) {
      throw AppError.notFound('Service not found');
    }
    return updated;
  }

  async deleteService(id: string): Promise<void> {
    const service = await this.serviceRepository.findById(id);
    if (!service) {
      throw AppError.notFound('Service not found');
    }
    await this.serviceRepository.delete(id);
  }
}
