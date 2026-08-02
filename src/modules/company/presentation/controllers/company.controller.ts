import { Request, Response, NextFunction } from 'express';
import { Container } from '@shared/di/index';
import { CompanyService } from '../../application/services/company.service';
import { ResponseFormatter } from '@shared/utils/responseFormatter';

export class CompanyController {
  private getCompanyService(): CompanyService {
    return Container.resolve<CompanyService>('CompanyService');
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const company = await this.getCompanyService().createCompany(req.body);
      res.status(201).json(ResponseFormatter.success(company));
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const company = await this.getCompanyService().getCompanyById(id);
      res.status(200).json(ResponseFormatter.success(company));
    } catch (error) {
      next(error);
    }
  };

  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companies = await this.getCompanyService().getAllCompanies();
      res.status(200).json(ResponseFormatter.success(companies));
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const company = await this.getCompanyService().updateCompany(id, req.body);
      res.status(200).json(ResponseFormatter.success(company));
    } catch (error) {
      next(error);
    }
  };
}
