import { Request, Response, NextFunction } from 'express';
import { Container } from '@shared/di/index';
import { ReportService } from '../../application/services/report.service';
import { ResponseFormatter } from '@shared/utils/responseFormatter';

export class ReportController {
  private getReportService(): ReportService {
    return Container.resolve<ReportService>('ReportService');
  }

  // --- SALES REPORTS ---
  getProposalsReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const data = await this.getReportService().getProposalsReport(companyId, req.query as any);
      res.status(200).json(ResponseFormatter.success(data));
    } catch (error) {
      next(error);
    }
  };

  getInvoicesReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const data = await this.getReportService().getInvoicesReport(companyId, req.query as any);
      res.status(200).json(ResponseFormatter.success(data));
    } catch (error) {
      next(error);
    }
  };

  getDailySalesReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const data = await this.getReportService().getDailySalesReport(companyId, req.query as any);
      res.status(200).json(ResponseFormatter.success(data));
    } catch (error) {
      next(error);
    }
  };

  getMonthlySalesReport = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const year = req.query.year ? parseInt(req.query.year as string, 10) : 2026;
      const data = await this.getReportService().getMonthlySalesReport(companyId, year);
      res.status(200).json(ResponseFormatter.success(data));
    } catch (error) {
      next(error);
    }
  };

  getSalesByServiceReport = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const data = await this.getReportService().getSalesByServiceReport(
        companyId,
        req.query as any,
      );
      res.status(200).json(ResponseFormatter.success(data));
    } catch (error) {
      next(error);
    }
  };

  getSalesByCategoryReport = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const data = await this.getReportService().getSalesByCategoryReport(
        companyId,
        req.query as any,
      );
      res.status(200).json(ResponseFormatter.success(data));
    } catch (error) {
      next(error);
    }
  };

  getSalesByCustomerReport = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const data = await this.getReportService().getSalesByCustomerReport(
        companyId,
        req.query as any,
      );
      res.status(200).json(ResponseFormatter.success(data));
    } catch (error) {
      next(error);
    }
  };

  getLeadsReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const data = await this.getReportService().getLeadsReport(companyId, req.query as any);
      res.status(200).json(ResponseFormatter.success(data));
    } catch (error) {
      next(error);
    }
  };

  getCreditNotesReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const data = await this.getReportService().getCreditNotesReport(companyId, req.query as any);
      res.status(200).json(ResponseFormatter.success(data));
    } catch (error) {
      next(error);
    }
  };

  // --- FINANCE REPORTS ---
  getOutstandingInvoicesReport = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const data = await this.getReportService().getOutstandingInvoicesReport(
        companyId,
        req.query as any,
      );
      res.status(200).json(ResponseFormatter.success(data));
    } catch (error) {
      next(error);
    }
  };

  getCustomerStatementReport = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const data = await this.getReportService().getCustomerStatementReport(
        companyId,
        req.query as any,
      );
      res.status(200).json(ResponseFormatter.success(data));
    } catch (error) {
      next(error);
    }
  };

  getSupplierStatementReport = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const data = await this.getReportService().getSupplierStatementReport(
        companyId,
        req.query as any,
      );
      res.status(200).json(ResponseFormatter.success(data));
    } catch (error) {
      next(error);
    }
  };

  getReceiptsReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const data = await this.getReportService().getReceiptsReport(companyId, req.query as any);
      res.status(200).json(ResponseFormatter.success(data));
    } catch (error) {
      next(error);
    }
  };

  getExpensesReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const data = await this.getReportService().getExpensesReport(companyId, req.query as any);
      res.status(200).json(ResponseFormatter.success(data));
    } catch (error) {
      next(error);
    }
  };

  getProfitAndLossReport = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const data = await this.getReportService().getProfitAndLossReport(
        companyId,
        req.query as any,
      );
      res.status(200).json(ResponseFormatter.success(data));
    } catch (error) {
      next(error);
    }
  };

  getVatReturnReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const data = await this.getReportService().getVatReturnReport(companyId, req.query as any);
      res.status(200).json(ResponseFormatter.success(data));
    } catch (error) {
      next(error);
    }
  };

  getProCommissionReport = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const data = await this.getReportService().getProCommissionReport(
        companyId,
        req.query as any,
      );
      res.status(200).json(ResponseFormatter.success(data));
    } catch (error) {
      next(error);
    }
  };

  getEmployeePerformanceReport = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const data = await this.getReportService().getEmployeePerformanceReport(
        companyId,
        req.query as any,
      );
      res.status(200).json(ResponseFormatter.success(data));
    } catch (error) {
      next(error);
    }
  };
}
