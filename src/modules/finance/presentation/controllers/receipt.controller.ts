import { Request, Response, NextFunction } from 'express';
import { Container } from '@shared/di/index';
import { ReceiptService } from '../../application/services/receipt.service';
import { ResponseFormatter } from '@shared/utils/responseFormatter';

export class ReceiptController {
  private getReceiptService(): ReceiptService {
    return Container.resolve<ReceiptService>('ReceiptService');
  }

  listReceipts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const {
        payment_method,
        status,
        customer_id,
        invoice_id,
        start_date,
        end_date,
        search,
        page,
        limit,
      } = req.query as Record<string, string | undefined>;

      const result = await this.getReceiptService().listReceipts(
        companyId,
        {
          payment_method,
          status,
          customer_id,
          invoice_id,
          start_date,
          end_date,
          search,
        },
        {
          page: page ? parseInt(page, 10) : 1,
          limit: limit ? parseInt(limit, 10) : 20,
        },
      );

      res.status(200).json(ResponseFormatter.success(result.receipts, result.meta));
    } catch (error) {
      next(error);
    }
  };

  getReceiptById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const receipt = await this.getReceiptService().getReceiptById(id);
      res.status(200).json(ResponseFormatter.success(receipt));
    } catch (error) {
      next(error);
    }
  };

  createReceipt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const receivedBy = (req.user as any)?.name || req.user?.email || 'System';

      const receipt = await this.getReceiptService().createReceipt(
        companyId,
        req.body,
        receivedBy,
      );

      res.status(201).json({
        success: true,
        message: 'Receipt voucher created successfully',
        data: receipt,
      });
    } catch (error) {
      next(error);
    }
  };

  updateReceipt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const receipt = await this.getReceiptService().updateReceipt(id, req.body);

      res.status(200).json({
        success: true,
        message: 'Receipt voucher updated successfully',
        data: receipt,
      });
    } catch (error) {
      next(error);
    }
  };

  cancelReceipt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.getReceiptService().cancelReceipt(id);

      res.status(200).json({
        success: true,
        message: 'Receipt voucher cancelled successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  downloadPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { buffer, filename } = await this.getReceiptService().generatePdf(id);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };
}
