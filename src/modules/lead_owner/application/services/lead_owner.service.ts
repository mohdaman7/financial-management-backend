import { v4 as uuidv4 } from 'uuid';
import { LeadOwnerRepository } from '../../infrastructure/repositories/lead_owner.repository';
import { ILeadOwner } from '../../infrastructure/models/LeadOwner.model';
import { AppError } from '@shared/errors/AppError';

export class LeadOwnerService {
  private repository: LeadOwnerRepository;

  constructor() {
    this.repository = new LeadOwnerRepository();
  }

  async createLeadOwner(data: Partial<ILeadOwner> & { company_id: string }): Promise<ILeadOwner> {
    const leadOwnerData = {
      ...data,
      id: uuidv4(),
      status: data.status || 'Active',
    };
    return this.repository.create(leadOwnerData);
  }

  async getLeadOwners(company_id: string): Promise<ILeadOwner[]> {
    return this.repository.findAll(company_id);
  }

  async getLeadOwnerById(id: string, company_id: string): Promise<ILeadOwner> {
    const leadOwner = await this.repository.findById(id, company_id);
    if (!leadOwner) {
      throw AppError.notFound('Lead Owner not found');
    }
    return leadOwner;
  }

  async updateLeadOwner(id: string, company_id: string, data: Partial<ILeadOwner>): Promise<ILeadOwner> {
    const leadOwner = await this.repository.update(id, company_id, data);
    if (!leadOwner) {
      throw AppError.notFound('Lead Owner not found');
    }
    return leadOwner;
  }

  async deleteLeadOwner(id: string, company_id: string): Promise<void> {
    const success = await this.repository.delete(id, company_id);
    if (!success) {
      throw AppError.notFound('Lead Owner not found');
    }
  }
}
