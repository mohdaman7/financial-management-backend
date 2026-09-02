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
      const companyId = req.companyId as string | undefined;
      const userId = req.user?.id;
      const service = await this.getServiceService().createService(companyId, req.body, userId);
      const data = service.toJSON ? service.toJSON() : service;
      res.status(201).json({
        success: true,
        message: 'Service created successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const service = await this.getServiceService().getServiceById(id);
      const data = service.toJSON ? service.toJSON() : service;
      res.status(200).json(ResponseFormatter.success(data));
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { category, sub_category, subCategory, status, priority, search, page, limit } = req.query;
      const companyId = req.companyId as string | undefined;

      const subCat = (sub_category || subCategory) ? String(sub_category || subCategory) : undefined;

      const result = await this.getServiceService().listServices({
        category: category ? String(category) : undefined,
        sub_category: subCat,
        status: status ? String(status) : undefined,
        priority: priority ? String(priority) : undefined,
        search: search ? String(search) : undefined,
        companyId,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 100,
      });

      const data = result.services.map((s) => (s.toJSON ? s.toJSON() : s));

      res.status(200).json({
        success: true,
        data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const userId = req.user?.id;
      const service = await this.getServiceService().updateService(id, req.body, userId);
      const data = service.toJSON ? service.toJSON() : service;
      res.status(200).json({
        success: true,
        message: 'Service updated successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.getServiceService().deleteService(id);
      res.status(200).json({
        success: true,
        message: 'Service deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
