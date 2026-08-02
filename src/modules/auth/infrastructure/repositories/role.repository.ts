import { RoleModel, IRole } from '../models/Role.model';

export class RoleRepository {
  async findById(id: string): Promise<IRole | null> {
    return RoleModel.findById(id).exec();
  }

  async findByNameAndCompany(name: string, companyId?: string): Promise<IRole | null> {
    const query: Record<string, unknown> = { name };
    if (companyId) {
      query.companyId = companyId;
    } else {
      query.companyId = null;
    }
    return RoleModel.findOne(query).exec();
  }

  async create(data: Partial<IRole>): Promise<IRole> {
    const role = new RoleModel(data);
    return role.save();
  }

  async update(id: string, data: Partial<IRole>): Promise<IRole | null> {
    return RoleModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<IRole | null> {
    return RoleModel.findByIdAndDelete(id).exec();
  }

  async findByCompany(companyId?: string): Promise<IRole[]> {
    const query = companyId ? { companyId } : { companyId: null };
    return RoleModel.find(query).exec();
  }
}
