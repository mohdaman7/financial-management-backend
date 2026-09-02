import {
  ServiceRepository,
  ServiceFilterParams,
} from '../../infrastructure/repositories/service.repository';
import { IService } from '../../infrastructure/models/Service.model';
import { Types } from 'mongoose';
import { AppError } from '@shared/errors/AppError';

export class ServiceService {
  constructor(private serviceRepository: ServiceRepository) {}

  private normalizeServiceData(data: Partial<IService>): Partial<IService> {
    const name = (data.name || data.serviceName || '').trim();
    const serviceName = name;

    const govFee = Number(data.government_fee ?? data.governmentFees ?? 0);
    const ourFee = Number(data.company_service_charge ?? data.companyServiceCharge ?? 0);
    const totalCost = Number(data.total_cost ?? data.price ?? govFee + ourFee);

    const requiredDocs = data.required_documents || data.requiredDocuments || [];
    const processingTime = data.processing_time || data.processingTime || '';
    const govDept = data.government_department || data.governmentDepartment || '';
    const subCategory = data.sub_category || data.subCategory || '';

    let faqs = data.faqs || [];
    if (Array.isArray(faqs)) {
      faqs = faqs.map((f: any) => ({
        q: f.q || f.question || '',
        a: f.a || f.answer || '',
        question: f.question || f.q || '',
        answer: f.answer || f.a || '',
      }));
    }

    let requiredSteps = data.required_steps || [];
    let stepsToApply = data.stepsToApply || [];
    if (requiredSteps.length > 0 && stepsToApply.length === 0) {
      stepsToApply = requiredSteps.map((s) => s.description);
    } else if (stepsToApply.length > 0 && requiredSteps.length === 0) {
      requiredSteps = stepsToApply.map((s, idx) => ({
        step: `Step ${idx + 1}`,
        description: s,
      }));
    }

    return {
      ...data,
      name,
      serviceName,
      category: data.category?.trim() || 'General',
      sub_category: subCategory,
      subCategory,
      icon: data.icon || 'Globe',
      description: data.description || '',
      government_department: govDept,
      governmentDepartment: govDept,
      country: data.country || 'United Arab Emirates',
      required_documents: requiredDocs,
      requiredDocuments: requiredDocs,
      eligibility: data.eligibility || '',
      processing_time: processingTime,
      processingTime,
      government_fee: govFee,
      governmentFees: govFee,
      company_service_charge: ourFee,
      companyServiceCharge: ourFee,
      total_cost: totalCost,
      price: totalCost,
      currency: data.currency || 'AED',
      priority: data.priority || 'normal',
      status: data.status || 'active',
      approval_required: data.approval_required ?? false,
      tags: data.tags || [],
      faqs,
      internal_notes: data.internal_notes || data.importantNotes || '',
      customer_notes: data.customer_notes || data.termsAndConditions || '',
      required_steps: requiredSteps,
      stepsToApply,
      documents_checklist: data.documents_checklist || [],
      downloadable_forms: data.downloadable_forms || [],
      official_links: data.official_links || [],
    };
  }

  async listServices(
    params: ServiceFilterParams,
  ): Promise<{ services: IService[]; total: number; page: number; limit: number }> {
    return this.serviceRepository.findAll(params);
  }

  async createService(
    companyId: string | undefined,
    data: Partial<IService>,
    userId?: string,
  ): Promise<IService> {
    const normalized = this.normalizeServiceData(data);
    if (!normalized.name) {
      throw AppError.badRequest('Service name is required');
    }

    const existing = await this.serviceRepository.findByServiceName(companyId, normalized.name, normalized.category);
    if (existing) {
      throw AppError.conflict('Service with this name already exists');
    }

    const payload: Partial<IService> = {
      ...normalized,
      created_by: userId,
      updated_by: userId,
    };

    if (companyId && Types.ObjectId.isValid(companyId)) {
      payload.companyId = new Types.ObjectId(companyId);
    }

    return this.serviceRepository.create(payload);
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

  async updateService(id: string, data: Partial<IService>, userId?: string): Promise<IService> {
    const service = await this.serviceRepository.findById(id);
    if (!service) {
      throw AppError.notFound('Service not found');
    }

    const normalized = this.normalizeServiceData({ ...service.toObject(), ...data });
    if (userId) {
      normalized.updated_by = userId;
    }

    const updated = await this.serviceRepository.update(id, normalized);
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
