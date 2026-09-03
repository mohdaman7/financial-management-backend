import { Request, Response, NextFunction } from 'express';
import { Container } from '@shared/di/index';
import { DashboardService } from '../../application/services/dashboard.service';
import { ResponseFormatter } from '@shared/utils/responseFormatter';

export class DashboardController {
  private getDashboardService(): DashboardService {
    return Container.resolve<DashboardService>('DashboardService');
  }

  getMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const metrics = await this.getDashboardService().getCompanyMetrics(companyId);
      res.status(200).json(ResponseFormatter.success(metrics));
    } catch (error) {
      next(error);
    }
  };

  getFinancialSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const summary = await this.getDashboardService().getFinancialSummary(companyId);
      res.status(200).json(ResponseFormatter.success(summary));
    } catch (error) {
      next(error);
    }
  };
}
