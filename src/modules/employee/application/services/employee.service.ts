import { Types } from 'mongoose';
import { EmployeeRepository } from '../../infrastructure/repositories/employee.repository';
import { UserRepository } from '../../../auth/infrastructure/repositories/user.repository';
import { IEmployee } from '../../infrastructure/models/Employee.model';
import { AppError } from '@shared/errors/AppError';
import { emailService } from '@infrastructure/email/email.service';

import { RoleRepository } from '../../../auth/infrastructure/repositories/role.repository';
import * as crypto from 'crypto';

export class EmployeeService {
  constructor(
    private employeeRepository: EmployeeRepository,
    private userRepository: UserRepository,
    private roleRepository: RoleRepository,
  ) {}

  async createEmployee(
    companyId: string,
    data: {
      email: string;
      password?: string;
      firstName: string;
      lastName: string;
      department: string;
      position: string;
      phone?: string;
      whatsapp?: string;
      nationality?: string;
      assigned_services?: string[];
      notes?: string;
      hireDate?: Date;
    },
  ): Promise<IEmployee> {
    // 1. Check if user already exists
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw AppError.conflict('User with this email already exists');
    }

    // Generate password if not provided
    const plainPassword = data.password || crypto.randomBytes(8).toString('hex');
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    // Auto-assign 'Employee' role
    const employeeRole = await this.roleRepository.findByNameAndCompany('Employee');
    if (!employeeRole) {
      throw AppError.badRequest('System role "Employee" not found');
    }

    // 2. Create User Credentials
    const user = await this.userRepository.create({
      email: data.email,
      passwordHash,
      isSuperAdmin: false,
      companyId: new Types.ObjectId(companyId),
      roleId: employeeRole._id as Types.ObjectId,
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
        whatsapp: data.whatsapp || '',
        nationality: data.nationality || '',
        assigned_services: data.assigned_services || [],
        notes: data.notes || '',
        hireDate: data.hireDate || new Date(),
        status: 'active',
        stats: { customers: 0, services_processed: 0, revenue: 0 },
      });

      // Attach the generated plain password to return to the frontend
      // Fire and forget email sending
      console.log('Sending Welcome Email:', data.email, plainPassword);
      emailService.sendWelcomeEmail(data.email, plainPassword);

      return { ...employee.toJSON(), _generatedPassword: plainPassword } as any;
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
      whatsapp?: string;
      nationality?: string;
      assigned_services?: string[];
      notes?: string;
      status?: 'active' | 'inactive' | 'on_leave';
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
      const userStatus = data.status === 'on_leave' ? 'active' : data.status;
      const userIdStr = typeof employee.userId === 'object' && (employee.userId as any)._id ? (employee.userId as any)._id.toString() : employee.userId.toString();
      await this.userRepository.update(userIdStr, { status: userStatus });
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
    const userIdStr = typeof employee.userId === 'object' && (employee.userId as any)._id ? (employee.userId as any)._id.toString() : employee.userId.toString();
    await this.userRepository.delete(userIdStr);
  }

  async resetPassword(id: string): Promise<string> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw AppError.notFound('Employee profile not found');
    }

    const userIdStr = typeof employee.userId === 'object' && (employee.userId as any)._id ? (employee.userId as any)._id.toString() : employee.userId.toString();
    const user = await this.userRepository.findById(userIdStr);
    if (!user) {
      throw AppError.notFound('Linked user account not found');
    }

    const crypto = require('crypto');
    const plainPassword = crypto.randomBytes(8).toString('hex');
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    await this.userRepository.update(userIdStr, { passwordHash });
    
    // Fire and forget password reset email
    emailService.sendPasswordResetEmail(user.email, plainPassword);

    return plainPassword;
  }
}
