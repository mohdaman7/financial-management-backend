import { Request, Response, NextFunction } from 'express';
import { Container } from '@shared/di/index';
import { AuditService } from '../../modules/audit/application/services/audit.service';

export function auditLogger() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Intercept only state-modifying HTTP methods
    const methodsToLog = ['POST', 'PUT', 'DELETE', 'PATCH'];
    if (!methodsToLog.includes(req.method)) {
      return next();
    }

    // Capture response finish to ensure we only log successful actions (or log status)
    res.on('finish', async () => {
      try {
        // Only log if the request was authenticated and was successful (2xx status)
        if (req.user?.id && res.statusCode >= 200 && res.statusCode < 300) {
          const auditService = Container.resolve<AuditService>('AuditService');
          
          let sanitizedBody = { ...req.body };
          // Don't log sensitive values like password
          if (sanitizedBody.password) delete sanitizedBody.password;
          if (sanitizedBody.passwordConfirm) delete sanitizedBody.passwordConfirm;

          await auditService.log({
            companyId: req.companyId,
            userId: req.user.id,
            action: `${req.method} ${req.originalUrl}`,
            ipAddress: req.ip || req.socket.remoteAddress || '',
            userAgent: req.headers['user-agent'] || '',
            details: {
              statusCode: res.statusCode,
              params: req.params,
              query: req.query,
              body: sanitizedBody,
            },
          });
        }
      } catch (error) {
        // Fail silently to avoid breaking the client response
        console.error('Failed to write audit log:', error);
      }
    });

    next();
  };
}
