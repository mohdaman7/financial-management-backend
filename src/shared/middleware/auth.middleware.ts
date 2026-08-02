import { Request, Response, NextFunction } from 'express';
import jsonwebtoken from 'jsonwebtoken';
import { config } from '@config/index';
import { AppError } from '@shared/errors/AppError';
import { TokenPayload } from '@modules/auth/application/services/auth.service';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(AppError.unauthorized('No authentication token provided', 'MISSING_TOKEN'));
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jsonwebtoken.verify(token, config.JWT_ACCESS_SECRET) as TokenPayload;
    req.user = decoded;
    next();
  } catch {
    next(AppError.unauthorized('Invalid or expired authentication token', 'INVALID_TOKEN'));
  }
}

export function requirePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      next(AppError.unauthorized());
      return;
    }

    // Super Admin has wildcard bypass
    if (user.isSuperAdmin) {
      next();
      return;
    }

    const hasPermission = user.permissions.includes(permission);
    if (!hasPermission) {
      next(
        AppError.forbidden(
          'You do not have permission to perform this action',
          'INSUFFICIENT_PERMISSIONS',
        ),
      );
      return;
    }

    next();
  };
}

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction): void {
  const user = req.user;
  if (!user) {
    next(AppError.unauthorized());
    return;
  }

  if (!user.isSuperAdmin) {
    next(
      AppError.forbidden('Access denied: Super Admin privilege required', 'SUPER_ADMIN_REQUIRED'),
    );
    return;
  }

  next();
}

export function authorizeCompany(req: Request, _res: Response, next: NextFunction): void {
  const user = req.user;
  if (!user) {
    next(AppError.unauthorized());
    return;
  }

  if (user.isSuperAdmin) {
    // Super Admin can access any company. Use their currently selected company context
    req.companyId = req.headers['x-company-id']?.toString() || user.companyId;
    next();
    return;
  }

  // Regular Employee is locked to their companyId
  const requestedCompanyId =
    req.headers['x-company-id']?.toString() || req.params.companyId || req.body?.companyId;

  if (requestedCompanyId && requestedCompanyId !== user.companyId) {
    next(
      AppError.forbidden(
        'Access denied: You do not have access to this company context',
        'ACCESS_DENIED',
      ),
    );
    return;
  }

  // Enforce companyId in the request
  req.companyId = user.companyId;
  next();
}
