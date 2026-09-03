import { Request, Response, NextFunction } from 'express';
import { Container } from '@shared/di/index';
import { InvoiceService } from '../../application/services/invoice.service';

export class InvoiceController {
  private getInvoiceService(): InvoiceService {
    return Container.resolve<InvoiceService>('InvoiceService');
  }

  createInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const createdBy = (req.user as any)?.name || req.user?.email || 'System';

      const invoice = await this.getInvoiceService().createInvoice(companyId, req.body, createdBy);

      res.status(201).json({
        status: 'success',
        message: 'Invoice generated successfully',
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  };

  listInvoices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const { status, lead_owner, start_date, end_date, search, page, limit } = req.query as Record<
        string,
        string | undefined
      >;

      const result = await this.getInvoiceService().listInvoices(
        companyId,
        {
          status,
          lead_owner,
          start_date,
          end_date,
          search,
        },
        {
          page: page ? parseInt(page, 10) : 1,
          limit: limit ? parseInt(limit, 10) : 20,
        },
      );

      res.status(200).json({
        status: 'success',
        meta: result.meta,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  getOutstandingInvoices = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const { search, status, start_date, end_date } = req.query as Record<
        string,
        string | undefined
      >;

      const result = await this.getInvoiceService().getOutstandingInvoices(companyId, {
        search,
        status,
        start_date,
        end_date,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        summary: result.summary,
      });
    } catch (error) {
      next(error);
    }
  };

  getInvoiceById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const invoice = await this.getInvoiceService().getInvoiceById(id);

      res.status(200).json({
        status: 'success',
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  };

  updateInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const invoice = await this.getInvoiceService().updateInvoice(id, req.body);

      res.status(200).json({
        status: 'success',
        message: 'Invoice updated successfully',
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.getInvoiceService().deleteInvoice(id);

      res.status(200).json({
        status: 'success',
        message: 'Invoice deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  exportPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const options = {
        format: req.body?.format || (req.query?.format as any) || 'pdf',
        print_header_logo: req.body?.print_header_logo ?? true,
        include_bank_details: req.body?.include_bank_details ?? true,
        watermark: req.body?.watermark ?? false,
      };

      const { buffer, filename } = await this.getInvoiceService().exportPdf(id, options);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };
}
