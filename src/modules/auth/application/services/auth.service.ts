import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { CompanyRepository } from '../../../company/infrastructure/repositories/company.repository';
import { Types } from 'mongoose';
import { config } from '@config/index';
import { AppError } from '@shared/errors/AppError';
import { IUser } from '../../infrastructure/models/User.model';
import { IRole } from '../../infrastructure/models/Role.model';

export interface TokenPayload {
  id: string;
  email: string;
  isSuperAdmin: boolean;
  role?: string;
  companyId?: string;
  roleId?: string;
  permissions: string[];
}

export interface UserProfileResponse {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'employee';
  avatar_color: string;
  avatar_initials: string;
  assignedCompanyId: string | null;
  last_login?: string | null;
  permissions?: string[];
}

const DEFAULT_PERMISSIONS: Record<'super_admin' | 'admin' | 'employee', string[]> = {
  super_admin: [
    'manage_users',
    'manage_workspaces',
    'view_all_finances',
    'approve_documents',
    'manage_settings',
    'manage_services',
    'view_services',
    'manage_travel',
    'view_travel',
    '*',
  ],
  admin: [
    'view_travel',
    'manage_travel',
    'view_services',
    'manage_services',
    'generate_invoices',
    'view_customers',
    'manage_customers',
    'view_reports',
    'approve_documents',
    'create_proposals',
    'create_quotations',
  ],
  employee: [
    'view_travel',
    'view_services',
    'view_customers',
    'manage_assigned_customers',
    'draft_quotations',
    'view_bookings',
  ],
};

const DEFAULT_AVATAR_COLORS: Record<'super_admin' | 'admin' | 'employee', string> = {
  super_admin: 'bg-purple-600',
  admin: 'bg-blue-600',
  employee: 'bg-emerald-600',
};

export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private companyRepository: CompanyRepository,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private resolveRole(user: IUser, roleObj?: IRole): 'super_admin' | 'admin' | 'employee' {
    if (user.role) return user.role;
    if (user.isSuperAdmin) return 'super_admin';
    if (roleObj?.name?.toLowerCase().includes('admin')) return 'admin';
    return 'employee';
  }

  private resolveInitials(name?: string, email?: string): string {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'US';
  }

  private resolvePermissions(roleKey: 'super_admin' | 'admin' | 'employee', roleObj?: IRole): string[] {
    const rolePermissions = roleObj?.permissions ?? [];
    const defaults = DEFAULT_PERMISSIONS[roleKey] || [];
    return Array.from(new Set([...defaults, ...rolePermissions]));
  }

  formatUserProfile(user: IUser, roleObj?: IRole): UserProfileResponse {
    const roleKey = this.resolveRole(user, roleObj);
    const name = user.name || user.email.split('@')[0].toUpperCase();
    const avatar_initials = user.avatar_initials || this.resolveInitials(name, user.email);
    const avatar_color = user.avatar_color || DEFAULT_AVATAR_COLORS[roleKey];

    return {
      id: user._id.toString(),
      name,
      email: user.email,
      role: roleKey,
      avatar_color,
      avatar_initials,
      assignedCompanyId: user.companyId ? user.companyId.toString() : null,
      last_login: user.last_login ? user.last_login.toISOString() : null,
    };
  }

  generateTokens(user: IUser, role?: IRole): { accessToken: string; refreshToken: string } {
    // Determine active company context
    const companyId = user.isSuperAdmin
      ? (user.currentCompanyId?.toString() || user.companyId?.toString())
      : user.companyId?.toString();

    const roleKey = this.resolveRole(user, role);
    const permissions = this.resolvePermissions(roleKey, role);

    const payload: TokenPayload = {
      id: user._id.toString(),
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      role: roleKey,
      companyId,
      roleId: user.roleId?.toString(),
      permissions: user.isSuperAdmin ? ['*'] : permissions,
    };

    const accessToken = jwt.sign(payload, config.JWT_ACCESS_SECRET, {
      expiresIn: (config.JWT_ACCESS_EXPIRES_IN || '24h') as any,
    });

    const refreshToken = jwt.sign({ id: user._id.toString() }, config.JWT_REFRESH_SECRET, {
      expiresIn: (config.JWT_REFRESH_EXPIRES_IN || '7d') as any,
    });

    return { accessToken, refreshToken };
  }

  async login(
    email: string,
    password: string,
    requestedRole?: 'super_admin' | 'admin' | 'employee',
  ): Promise<{
    token: string;
    accessToken: string;
    refreshToken: string;
    expires_in: number;
    user: UserProfileResponse & { isSuperAdmin: boolean; companyId?: string; roleId?: string };
  }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user || user.status === 'inactive') {
      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const isPasswordValid = await this.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const roleObj = user.roleId ? (user.roleId as unknown as IRole) : undefined;
    const currentRole = this.resolveRole(user, roleObj);

    if (requestedRole && requestedRole !== currentRole && !user.isSuperAdmin) {
      throw AppError.forbidden(
        `Access denied. Your account is configured as ${currentRole} rather than ${requestedRole}.`,
        'FORBIDDEN',
      );
    }

    const now = new Date();
    const tokens = this.generateTokens(user, roleObj);

    await this.userRepository.update(user._id.toString(), {
      refreshToken: tokens.refreshToken,
      last_login: now,
    });

    const profile = this.formatUserProfile(user, roleObj);
    profile.last_login = now.toISOString();

    return {
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expires_in: 86400,
      user: {
        ...profile,
        isSuperAdmin: user.isSuperAdmin,
        companyId: user.companyId?.toString(),
        roleId: user.roleId?.toString(),
      },
    };
  }

  async getMe(userId: string): Promise<UserProfileResponse & { permissions: string[] }> {
    const user = await this.userRepository.findById(userId);
    if (!user || user.status === 'inactive') {
      throw AppError.notFound('User not found');
    }

    const roleObj = user.roleId ? (user.roleId as unknown as IRole) : undefined;
    const roleKey = this.resolveRole(user, roleObj);
    const profile = this.formatUserProfile(user, roleObj);
    const permissions = this.resolvePermissions(roleKey, roleObj);

    return {
      ...profile,
      permissions,
    };
  }

  async refresh(token: string): Promise<{ token: string; accessToken: string; refreshToken: string; expires_in: number }> {
    try {
      const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET) as { id: string };
      const user = await this.userRepository.findById(decoded.id);

      if (!user || user.refreshToken !== token || user.status === 'inactive') {
        throw AppError.unauthorized('Invalid or expired refresh token', 'INVALID_TOKEN');
      }

      const roleObj = user.roleId ? (user.roleId as unknown as IRole) : undefined;
      const tokens = this.generateTokens(user, roleObj);

      await this.userRepository.update(user._id.toString(), { refreshToken: tokens.refreshToken });

      return {
        token: tokens.accessToken,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expires_in: 86400,
      };
    } catch {
      throw AppError.unauthorized('Invalid or expired refresh token', 'INVALID_TOKEN');
    }
  }

  async logout(token?: string, userId?: string): Promise<void> {
    if (token) {
      const user = await this.userRepository.findByRefreshToken(token);
      if (user) {
        await this.userRepository.update(user._id.toString(), { refreshToken: undefined });
        return;
      }
    }

    if (userId) {
      await this.userRepository.update(userId, { refreshToken: undefined });
    }
  }

  async switchCompany(
    userId: string,
    companyId: string,
  ): Promise<{ accessToken: string; refreshToken: string; token: string; expires_in: number }> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.isSuperAdmin) {
      throw AppError.forbidden('Only Super Admins can switch company contexts');
    }

    const company = await this.companyRepository.findById(companyId);
    if (!company || company.status === 'inactive') {
      throw AppError.notFound('Company not found or inactive');
    }

    const updatedUser = await this.userRepository.update(userId, {
      currentCompanyId: company._id as Types.ObjectId,
    });

    if (!updatedUser) {
      throw AppError.notFound('User not found');
    }

    const tokens = this.generateTokens(updatedUser);
    await this.userRepository.update(userId, { refreshToken: tokens.refreshToken });

    return {
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expires_in: 86400,
    };
  }
}

