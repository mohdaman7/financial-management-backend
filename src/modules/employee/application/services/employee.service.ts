import { Types } from 'mongoose';
import { EmployeeRepository } from '../../infrastructure/repositories/employee.repository';
import { UserRepository } from '../../../auth/infrastructure/repositories/user.repository';
import { IEmployee } from '../../infrastructure/models/Employee.model';
import { AppError } from '@shared/errors/AppError';
import bcrypt from 'bcrypt';

export class EmployeeService {
  constructor(
    private employeeRepository: EmployeeRepository,
    private userRepository: UserRepository,
  ) {}

  async createEmployee(
    companyId: string,
    data: {
      email: string;
      passwordHash: string;
      roleId: string;
      firstName: string;
      lastName: string;
      department: string;
      position: string;
      phone?: string;
      hireDate?: Date;
    },
  ): Promise<IEmployee> {
    // 1. Check if user already exists
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw AppError.conflict('User with this email already exists');
    }

    // 2. Create User Credentials
    const user = await this.userRepository.create({
      email: data.email,
      passwordHash: data.passwordHash,
      isSuperAdmin: false,
      companyId: new Types.ObjectId(companyId),
      roleId: new Types.ObjectId(data.roleId),
      status: 'active',
    });

    // 3. Create Employee profile linked to User
    try {
      const employee = await this.employeeRepository.create({
        userId: user._id as Types.ObjectId,
        companyId: new Types.ObjectId(companyId),
        firstName: data.firstName,
        lastName: data.lastName,
        department: data.department,
        position: data.position,
        phone: data.phone || '',
        hireDate: data.hireDate || new Date(),
        status: 'active',
      });

      return employee;
    } catch (error) {
      // Rollback User creation if Employee creation fails
      await this.userRepository.delete(user._id.toString());
      throw error;
    }
  }

  async getEmployeeById(id: string): Promise<IEmployee> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw AppError.notFound('Employee profile not found');
    }
    return employee;
  }

  async getEmployeeByUserId(userId: string): Promise<IEmployee> {
    const employee = await this.employeeRepository.findByUserId(userId);
    if (!employee) {
      throw AppError.notFound('Employee profile not found for this user');
    }
    return employee;
  }

  async getCompanyEmployees(companyId: string): Promise<IEmployee[]> {
    return this.employeeRepository.findByCompanyId(companyId);
  }

  async updateEmployee(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      department?: string;
      position?: string;
      phone?: string;
      status?: 'active' | 'inactive';
    },
  ): Promise<IEmployee> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw AppError.notFound('Employee profile not found');
    }

    // Update Employee profile details
    const updated = await this.employeeRepository.update(id, data);
    if (!updated) {
      throw AppError.notFound('Employee profile not found');
    }

    // Update linked user status if employee status is changing
    if (data.status) {
      await this.userRepository.update(employee.userId.toString(), { status: data.status });
    }

    return updated;
  }

  async deleteEmployee(id: string): Promise<void> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw AppError.notFound('Employee profile not found');
    }

    // Delete Employee record and linked User account
    await this.employeeRepository.delete(id);
    await this.userRepository.delete(employee.userId.toString());
  }
}
