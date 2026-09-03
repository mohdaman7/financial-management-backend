import { Request, Response, NextFunction } from 'express';
import { Container } from '@shared/di/index';
import { FinanceService } from '../../application/services/finance.service';
import { ResponseFormatter } from '@shared/utils/responseFormatter';

export class FinanceController {
  private getFinanceService(): FinanceService {
    return Container.resolve<FinanceService>('FinanceService');
  }
  createBankAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const bankAccount = await this.getFinanceService().createBankAccount(companyId, req.body);
      res.status(201).json(ResponseFormatter.success(bankAccount));
    } catch (error) {
      next(error);
    }
  };

  listBankAccounts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const bankAccounts = await this.getFinanceService().getBankAccounts(companyId);
      res.status(200).json(ResponseFormatter.success(bankAccounts));
    } catch (error) {
      next(error);
    }
  };

  updateBankAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const bankAccount = await this.getFinanceService().updateBankAccount(id, req.body);
      res.status(200).json(ResponseFormatter.success(bankAccount));
    } catch (error) {
      next(error);
    }
  };

  deleteBankAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.getFinanceService().deleteBankAccount(id);
      res
        .status(200)
        .json(ResponseFormatter.success({ message: 'Bank account deleted successfully' }));
    } catch (error) {
      next(error);
    }
  };

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
      res
        .status(200)
        .json(ResponseFormatter.success({ message: 'Transaction deleted successfully' }));
    } catch (error) {
      next(error);
    }
  };

  getProfitAndLoss = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const { startDate: qStart, endDate: qEnd } = req.query as any;
      const startDate = qStart instanceof Date ? qStart : new Date(qStart);
      const endDate = qEnd instanceof Date ? qEnd : new Date(qEnd);

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

  exportProfitAndLoss = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const { startDate: qStart, endDate: qEnd } = req.query as any;
      const startDate = qStart instanceof Date ? qStart : new Date(qStart);
      const endDate = qEnd instanceof Date ? qEnd : new Date(qEnd);

      const statement = await this.getFinanceService().getProfitAndLoss(
        companyId,
        startDate,
        endDate,
      );

      // Generate CSV
      let csv = 'Profit & Loss Statement\n';
      csv += `Period,${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n\n`;

      csv += 'REVENUE\n';
      for (const [category, amount] of Object.entries(statement.revenueByCategory)) {
        csv += `${category},${amount.toFixed(2)}\n`;
      }
      csv += `Total Revenue,${statement.totalRevenue.toFixed(2)}\n\n`;

      csv += 'EXPENSES\n';
      for (const [category, amount] of Object.entries(statement.expensesByCategory)) {
        csv += `${category},${amount.toFixed(2)}\n`;
      }
      csv += `Total Expenses,${statement.totalExpenses.toFixed(2)}\n\n`;
      csv += `Net Profit,${statement.netProfit.toFixed(2)}\n`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=profit_and_loss.csv');
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  };

  getCashFlow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const { startDate: qStart, endDate: qEnd } = req.query as any;
      const startDate = qStart instanceof Date ? qStart : new Date(qStart);
      const endDate = qEnd instanceof Date ? qEnd : new Date(qEnd);

      const statement = await this.getFinanceService().getCashFlow(companyId, startDate, endDate);
      res.status(200).json(ResponseFormatter.success(statement));
    } catch (error) {
      next(error);
    }
  };

  exportCashFlow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const { startDate: qStart, endDate: qEnd } = req.query as any;
      const startDate = qStart instanceof Date ? qStart : new Date(qStart);
      const endDate = qEnd instanceof Date ? qEnd : new Date(qEnd);

      const statement = await this.getFinanceService().getCashFlow(companyId, startDate, endDate);

      // Generate CSV
      let csv = 'Cash Flow Statement\n';
      csv += `Period,${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n\n`;

      csv += 'CASH INFLOWS\n';
      for (const [method, amount] of Object.entries(statement.inflow.byMethod)) {
        csv += `${method},${amount.toFixed(2)}\n`;
      }
      csv += `Total Inflow,${statement.inflow.total.toFixed(2)}\n\n`;

      csv += 'CASH OUTFLOWS\n';
      for (const [method, amount] of Object.entries(statement.outflow.byMethod)) {
        csv += `${method},${amount.toFixed(2)}\n`;
      }
      csv += `Total Outflow,${statement.outflow.total.toFixed(2)}\n\n`;
      csv += `Net Cash Flow,${statement.netCashFlow.toFixed(2)}\n`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=cash_flow.csv');
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  };

  getBankStatement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const { startDate, endDate, search, accountType, page, limit } = req.query as any;

      const result = await this.getFinanceService().getBankStatement(companyId, {
        startDate,
        endDate,
        search,
        accountType,
        page: page ? parseInt(String(page), 10) : undefined,
        limit: limit ? parseInt(String(limit), 10) : undefined,
      });

      res.status(200).json({
        success: true,
        message: 'Bank account statement fetched successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getAdvancePayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const { startDate, endDate, search, status, page, limit } = req.query as any;

      const result = await this.getFinanceService().getAdvancePayments(companyId, {
        startDate,
        endDate,
        search,
        status,
        page: page ? parseInt(String(page), 10) : undefined,
        limit: limit ? parseInt(String(limit), 10) : undefined,
      });

      res.status(200).json({
        success: true,
        message: 'Advance payments fetched successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}


