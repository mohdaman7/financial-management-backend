import { Request, Response, NextFunction } from 'express';
import { Container } from '@shared/di/index';
import { EmployeeService } from '../../application/services/employee.service';
import { ResponseFormatter } from '@shared/utils/responseFormatter';
import bcrypt from 'bcrypt';

export class EmployeeController {
  private getEmployeeService(): EmployeeService {
    return Container.resolve<EmployeeService>('EmployeeService');
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string; // From authorizeCompany middleware
      const passwordHash = await bcrypt.hash(req.body.password, 10);

      const employee = await this.getEmployeeService().createEmployee(companyId, {
        ...req.body,
        passwordHash,
      });

      res.status(201).json(ResponseFormatter.success(employee));
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const employee = await this.getEmployeeService().getEmployeeById(id);
      res.status(200).json(ResponseFormatter.success(employee));
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const employees = await this.getEmployeeService().getCompanyEmployees(companyId);
      res.status(200).json(ResponseFormatter.success(employees));
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const employee = await this.getEmployeeService().updateEmployee(id, req.body);
      res.status(200).json(ResponseFormatter.success(employee));
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.getEmployeeService().deleteEmployee(id);
      res
        .status(200)
        .json(ResponseFormatter.success({ message: 'Employee profile deleted successfully' }));
    } catch (error) {
      next(error);
    }
  };
}
