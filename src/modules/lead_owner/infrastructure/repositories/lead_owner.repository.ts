import { LeadOwner, ILeadOwner } from '../models/LeadOwner.model';

export class LeadOwnerRepository {
  async create(data: Partial<ILeadOwner>): Promise<ILeadOwner> {
    const leadOwner = new LeadOwner(data);
    return leadOwner.save();
  }

  async findAll(company_id: string): Promise<ILeadOwner[]> {
    return LeadOwner.find({ company_id }).sort({ created_at: -1 });
  }

  async findById(id: string, company_id: string): Promise<ILeadOwner | null> {
    return LeadOwner.findOne({ id, company_id });
  }

  async update(id: string, company_id: string, data: Partial<ILeadOwner>): Promise<ILeadOwner | null> {
    return LeadOwner.findOneAndUpdate({ id, company_id }, data, { new: true });
  }

  async delete(id: string, company_id: string): Promise<boolean> {
    const result = await LeadOwner.deleteOne({ id, company_id });
    return result.deletedCount > 0;
  }
}
