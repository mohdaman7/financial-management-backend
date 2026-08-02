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
  companyId?: string;
  roleId?: string;
  permissions: string[];
}

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

  generateTokens(user: IUser, role?: IRole): { accessToken: string; refreshToken: string } {
    // Determine active company context
    const companyId = user.isSuperAdmin
      ? user.currentCompanyId?.toString()
      : user.companyId?.toString();

    const payload: TokenPayload = {
      id: user._id.toString(),
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      companyId,
      roleId: user.roleId?.toString(),
      permissions: user.isSuperAdmin ? ['*'] : (role?.permissions ?? []),
    };

    const accessToken = jwt.sign(payload, config.JWT_ACCESS_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRES_IN as any,
    });

    const refreshToken = jwt.sign({ id: user._id.toString() }, config.JWT_REFRESH_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN as any,
    });

    return { accessToken, refreshToken };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; isSuperAdmin: boolean; companyId?: string; roleId?: string };
  }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user || user.status === 'inactive') {
      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const isPasswordValid = await this.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const role = user.roleId ? (user.roleId as unknown as IRole) : undefined;
    const tokens = this.generateTokens(user, role);

    await this.userRepository.update(user._id.toString(), { refreshToken: tokens.refreshToken });

    return {
      ...tokens,
      user: {
        id: user._id.toString(),
        email: user.email,
        isSuperAdmin: user.isSuperAdmin,
        companyId: user.companyId?.toString(),
        roleId: user.roleId?.toString(),
      },
    };
  }

  async refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET) as { id: string };
      const user = await this.userRepository.findById(decoded.id);

      if (!user || user.refreshToken !== token || user.status === 'inactive') {
        throw AppError.unauthorized('Invalid or expired refresh token', 'INVALID_TOKEN');
      }

      const role = user.roleId ? (user.roleId as unknown as IRole) : undefined;
      const tokens = this.generateTokens(user, role);

      await this.userRepository.update(user._id.toString(), { refreshToken: tokens.refreshToken });

      return tokens;
    } catch {
      throw AppError.unauthorized('Invalid or expired refresh token', 'INVALID_TOKEN');
    }
  }

  async logout(token: string): Promise<void> {
    const user = await this.userRepository.findByRefreshToken(token);
    if (user) {
      await this.userRepository.update(user._id.toString(), { refreshToken: undefined });
    }
  }

  async switchCompany(
    userId: string,
    companyId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.isSuperAdmin) {
      throw AppError.forbidden('Only Super Admins can switch company contexts');
    }

    const company = await this.companyRepository.findById(companyId);
    if (!company || company.status === 'inactive') {
      throw AppError.notFound('Company not found or inactive');
    }

    // Set the current company context
    const updatedUser = await this.userRepository.update(userId, {
      currentCompanyId: company._id as Types.ObjectId,
    });

    if (!updatedUser) {
      throw AppError.notFound('User not found');
    }

    const tokens = this.generateTokens(updatedUser);
    await this.userRepository.update(userId, { refreshToken: tokens.refreshToken });

    return tokens;
  }
}
