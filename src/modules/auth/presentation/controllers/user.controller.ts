import { Request, Response, NextFunction } from 'express';
import { Container } from '@shared/di/index';
import { UserService } from '../../application/services/user.service';
import { ResponseFormatter } from '@shared/utils/responseFormatter';

export class UserController {
  private getUserService(): UserService {
    return Container.resolve<UserService>('UserService');
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId; // Inject from authorizeCompany middleware
      const user = await this.getUserService().createUser({
        ...req.body,
        companyId: req.body.companyId || companyId,
      });
      res.status(201).json(
        ResponseFormatter.success({
          id: user._id.toString(),
          email: user.email,
          isSuperAdmin: user.isSuperAdmin,
          companyId: user.companyId,
          roleId: user.roleId,
          status: user.status,
        }),
      );
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const user = await this.getUserService().getUserById(id);
      res.status(200).json(
        ResponseFormatter.success({
          id: user._id.toString(),
          email: user.email,
          isSuperAdmin: user.isSuperAdmin,
          companyId: user.companyId,
          roleId: user.roleId,
          status: user.status,
        }),
      );
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId;
      if (!companyId) {
        res.status(200).json(ResponseFormatter.success([]));
        return;
      }
      const employees = await this.getUserService().getCompanyEmployees(companyId);
      const formatted = employees.map((user) => ({
        id: user._id.toString(),
        email: user.email,
        isSuperAdmin: user.isSuperAdmin,
        companyId: user.companyId,
        roleId: user.roleId,
        status: user.status,
      }));
      res.status(200).json(ResponseFormatter.success(formatted));
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const user = await this.getUserService().updateUser(id, req.body);
      res.status(200).json(
        ResponseFormatter.success({
          id: user._id.toString(),
          email: user.email,
          isSuperAdmin: user.isSuperAdmin,
          companyId: user.companyId,
          roleId: user.roleId,
          status: user.status,
        }),
      );
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.getUserService().deleteUser(id);
      res.status(200).json(ResponseFormatter.success({ message: 'User deleted successfully' }));
    } catch (error) {
      next(error);
    }
  };
}
