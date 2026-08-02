import bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { IUser } from '../../infrastructure/models/User.model';
import { AppError } from '@shared/errors/AppError';

export class UserService {
  constructor(private userRepository: UserRepository) {}

  async createUser(data: {
    email: string;
    password: string;
    isSuperAdmin?: boolean;
    companyId?: string;
    roleId?: string;
  }): Promise<IUser> {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      throw AppError.conflict('User with this email already exists');
    }

    if (data.isSuperAdmin) {
      const superAdminCount = await this.userRepository.countSuperAdmins();
      if (superAdminCount >= 2) {
        throw AppError.forbidden('Maximum of 2 Super Admin accounts are allowed');
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    return this.userRepository.create({
      email: data.email,
      passwordHash,
      isSuperAdmin: !!data.isSuperAdmin,
      companyId: data.companyId ? new Types.ObjectId(data.companyId) : undefined,
      roleId: data.roleId ? new Types.ObjectId(data.roleId) : undefined,
      status: 'active',
    });
  }

  async getUserById(id: string): Promise<IUser> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw AppError.notFound('User not found');
    }
    return user;
  }

  async getCompanyEmployees(companyId: string): Promise<IUser[]> {
    return this.userRepository.findEmployeesByCompany(companyId);
  }

  async updateUser(id: string, data: Partial<IUser> & { password?: string }): Promise<IUser> {
    const updateData: Partial<IUser> = { ...data };
    delete updateData.passwordHash;

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const user = await this.userRepository.update(id, updateData);
    if (!user) {
      throw AppError.notFound('User not found');
    }
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.userRepository.delete(id);
    if (!user) {
      throw AppError.notFound('User not found');
    }
  }
}
