import { CompanyModel, ICompany } from '../models/Company.model';

export class CompanyRepository {
  async findById(id: string): Promise<ICompany | null> {
    return CompanyModel.findById(id).exec();
  }

  async findByCode(code: string): Promise<ICompany | null> {
    return CompanyModel.findOne({ code: code.toUpperCase() }).exec();
  }

  async create(data: Partial<ICompany>): Promise<ICompany> {
    const company = new CompanyModel(data);
    return company.save();
  }

  async findAll(): Promise<ICompany[]> {
    return CompanyModel.find().exec();
  }
}
