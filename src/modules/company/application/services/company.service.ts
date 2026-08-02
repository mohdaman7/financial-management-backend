import { CompanyRepository } from '../../infrastructure/repositories/company.repository';
import { ICompany } from '../../infrastructure/models/Company.model';
import { AppError } from '@shared/errors/AppError';

export class CompanyService {
  constructor(private companyRepository: CompanyRepository) {}

  async createCompany(data: { name: string; code: string }): Promise<ICompany> {
    const existing = await this.companyRepository.findByCode(data.code);
    if (existing) {
      throw AppError.conflict('Company with this code already exists');
    }

    return this.companyRepository.create({
      name: data.name,
      code: data.code.toUpperCase(),
      status: 'active',
    });
  }

  async getCompanyById(id: string): Promise<ICompany> {
    const company = await this.companyRepository.findById(id);
    if (!company) {
      throw AppError.notFound('Company not found');
    }
    return company;
  }

  async getAllCompanies(): Promise<ICompany[]> {
    return this.companyRepository.findAll();
  }

  async updateCompany(id: string, data: Partial<ICompany>): Promise<ICompany> {
    const company = await this.companyRepository.findById(id);
    if (!company) {
      throw AppError.notFound('Company not found');
    }

    if (data.code) {
      const existing = await this.companyRepository.findByCode(data.code);
      if (existing && existing._id.toString() !== id) {
        throw AppError.conflict('Company with this code already exists');
      }
      company.code = data.code.toUpperCase();
    }

    if (data.name) {
      company.name = data.name;
    }

    if (data.status) {
      company.status = data.status;
    }

    return company.save();
  }
}
