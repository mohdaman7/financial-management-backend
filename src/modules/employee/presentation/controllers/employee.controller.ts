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

      const employee = await this.getEmployeeService().createEmployee(companyId, req.body);
      const formattedEmployee = {
        ...employee,
        email: employee.userId && (employee.userId as any).email ? (employee.userId as any).email : req.body.email,
      };

      res.status(201).json(ResponseFormatter.success(formattedEmployee));
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const employee = await this.getEmployeeService().getEmployeeById(id);
      const employeeJson = (employee as any).toJSON ? (employee as any).toJSON() : employee;
      const formattedEmployee = {
        ...employeeJson,
        email: employee.userId && (employee.userId as any).email ? (employee.userId as any).email : undefined,
      };
      res.status(200).json(ResponseFormatter.success(formattedEmployee));
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const employees = await this.getEmployeeService().getCompanyEmployees(companyId);
      const formattedEmployees = employees.map(emp => {
        const empJson = (emp as any).toJSON ? (emp as any).toJSON() : emp;
        return {
          ...empJson,
          email: emp.userId && (emp.userId as any).email ? (emp.userId as any).email : undefined,
        };
      });
      res.status(200).json(ResponseFormatter.success(formattedEmployees));
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

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const plainPassword = await this.getEmployeeService().resetPassword(id);
      res.status(200).json(ResponseFormatter.success({ plainPassword }));
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
