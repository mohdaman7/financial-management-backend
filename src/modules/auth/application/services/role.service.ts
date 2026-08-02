import { RoleRepository } from '../../infrastructure/repositories/role.repository';
import { IRole } from '../../infrastructure/models/Role.model';
import { AppError } from '@shared/errors/AppError';

export class RoleService {
  constructor(private roleRepository: RoleRepository) {}

  async createRole(data: {
    name: string;
    description: string;
    permissions: string[];
    companyId?: string;
  }): Promise<IRole> {
    const existing = await this.roleRepository.findByNameAndCompany(data.name, data.companyId);
    if (existing) {
      throw AppError.conflict('Role with this name already exists for the company');
    }

    return this.roleRepository.create(data);
  }

  async getRoleById(id: string): Promise<IRole> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw AppError.notFound('Role not found');
    }
    return role;
  }

  async getCompanyRoles(companyId?: string): Promise<IRole[]> {
    return this.roleRepository.findByCompany(companyId);
  }

  async updateRole(id: string, data: Partial<IRole>): Promise<IRole> {
    const role = await this.roleRepository.update(id, data);
    if (!role) {
      throw AppError.notFound('Role not found');
    }
    return role;
  }

  async deleteRole(id: string): Promise<void> {
    const role = await this.roleRepository.delete(id);
    if (!role) {
      throw AppError.notFound('Role not found');
    }
  }
}
