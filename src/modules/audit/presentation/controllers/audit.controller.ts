import { Request, Response, NextFunction } from 'express';
import { Container } from '@shared/di/index';
import { AuditService } from '../../application/services/audit.service';
import { ResponseFormatter } from '@shared/utils/responseFormatter';

export class AuditController {
  private getAuditService(): AuditService {
    return Container.resolve<AuditService>('AuditService');
  }

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      // Super admins can view all or switch context. Regular employees don't have access.
      const logs = await this.getAuditService().getLogs(
        req.user?.isSuperAdmin ? undefined : companyId,
      );
      res.status(200).json(ResponseFormatter.success(logs));
    } catch (error) {
      next(error);
    }
  };
}
