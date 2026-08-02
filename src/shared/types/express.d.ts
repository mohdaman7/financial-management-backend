import 'express';

declare module 'express' {
  interface Request {
    requestId?: string;
    user?: {
      id: string;
      email: string;
      isSuperAdmin: boolean;
      companyId?: string;
      roleId?: string;
      permissions: string[];
    };
    companyId?: string;
  }
}
