import { Request, Response, NextFunction } from 'express';
import { Container } from '@shared/di/index';
import { FinanceService } from '../../application/services/finance.service';
import { ResponseFormatter } from '@shared/utils/responseFormatter';

export class FinanceController {
  private getFinanceService(): FinanceService {
    return Container.resolve<FinanceService>('FinanceService');
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const transaction = await this.getFinanceService().createTransaction(companyId, req.body);
      res.status(201).json(ResponseFormatter.success(transaction));
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const transaction = await this.getFinanceService().getTransactionById(id);
      res.status(200).json(ResponseFormatter.success(transaction));
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const { type, category, startDate, endDate } = req.query as {
        type?: string;
        category?: string;
        startDate?: string;
        endDate?: string;
      };

      const filters: any = { type, category };
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);

      const transactions = await this.getFinanceService().getTransactions(companyId, filters);
      res.status(200).json(ResponseFormatter.success(transactions));
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const transaction = await this.getFinanceService().updateTransaction(id, req.body);
      res.status(200).json(ResponseFormatter.success(transaction));
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.getFinanceService().deleteTransaction(id);
      res.status(200).json(ResponseFormatter.success({ message: 'Transaction deleted successfully' }));
    } catch (error) {
      next(error);
    }
  };

  getProfitAndLoss = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      // Zod validation transforms startDate/endDate strings to Dates, so we can cast directly
      const { startDate, endDate } = req.query as unknown as { startDate: Date; endDate: Date };

      const statement = await this.getFinanceService().getProfitAndLoss(
        companyId,
        startDate,
        endDate,
      );
      res.status(200).json(ResponseFormatter.success(statement));
    } catch (error) {
      next(error);
    }
  };

  getCashFlow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const { startDate, endDate } = req.query as unknown as { startDate: Date; endDate: Date };

      const statement = await this.getFinanceService().getCashFlow(companyId, startDate, endDate);
      res.status(200).json(ResponseFormatter.success(statement));
    } catch (error) {
      next(error);
    }
  };
}
