import { Request, Response, NextFunction } from 'express';
import { Container } from '@shared/di/index';
import { ServiceService } from '../../application/services/service.service';
import { ResponseFormatter } from '@shared/utils/responseFormatter';

export class ServiceController {
  private getServiceService(): ServiceService {
    return Container.resolve<ServiceService>('ServiceService');
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const service = await this.getServiceService().createService(companyId, req.body);
      res.status(201).json(ResponseFormatter.success(service));
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const service = await this.getServiceService().getServiceById(id);
      res.status(200).json(ResponseFormatter.success(service));
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const services = await this.getServiceService().getServicesByCompany(companyId);
      res.status(200).json(ResponseFormatter.success(services));
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const service = await this.getServiceService().updateService(id, req.body);
      res.status(200).json(ResponseFormatter.success(service));
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.getServiceService().deleteService(id);
      res.status(200).json(ResponseFormatter.success({ message: 'Service deleted successfully' }));
    } catch (error) {
      next(error);
    }
  };
}
