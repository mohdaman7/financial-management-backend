import { Request, Response, NextFunction } from 'express';
import { Container } from '@shared/di/index';
import { RoleService } from '../../application/services/role.service';
import { ResponseFormatter } from '@shared/utils/responseFormatter';

export class RoleController {
  private getRoleService(): RoleService {
    return Container.resolve<RoleService>('RoleService');
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId; // Inject from authorizeCompany middleware
      const role = await this.getRoleService().createRole({
        ...req.body,
        companyId: req.body.companyId || companyId,
      });
      res.status(201).json(ResponseFormatter.success(role));
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const role = await this.getRoleService().getRoleById(id);
      res.status(200).json(ResponseFormatter.success(role));
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId;
      const roles = await this.getRoleService().getCompanyRoles(companyId);
      res.status(200).json(ResponseFormatter.success(roles));
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const role = await this.getRoleService().updateRole(id, req.body);
      res.status(200).json(ResponseFormatter.success(role));
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.getRoleService().deleteRole(id);
      res.status(200).json(ResponseFormatter.success({ message: 'Role deleted successfully' }));
    } catch (error) {
      next(error);
    }
  };
}
