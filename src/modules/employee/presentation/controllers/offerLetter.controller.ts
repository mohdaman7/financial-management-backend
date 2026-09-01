import { Request, Response, NextFunction } from 'express';
import { Container } from '@shared/di/index';
import { OfferLetterService } from '../../application/services/offerLetter.service';

export class OfferLetterController {
  private getOfferLetterService(): OfferLetterService {
    return Container.resolve<OfferLetterService>('OfferLetterService');
  }

  createOfferLetter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const createdBy = (req.user as any)?.name || req.user?.email || 'System';

      const offerLetter = await this.getOfferLetterService().createOfferLetter(
        companyId,
        req.body,
        createdBy,
      );

      res.status(201).json({
        status: 'success',
        message: 'Offer letter generated successfully',
        data: offerLetter,
      });
    } catch (error) {
      next(error);
    }
  };

  listOfferLetters = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const { status, search, page, limit } = req.query as Record<string, string | undefined>;

      const result = await this.getOfferLetterService().listOfferLetters(
        companyId,
        { status, search },
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

  getOfferLetterById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const offerLetter = await this.getOfferLetterService().getOfferLetterById(id);

      res.status(200).json({
        status: 'success',
        data: offerLetter,
      });
    } catch (error) {
      next(error);
    }
  };

  updateOfferLetter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const updated = await this.getOfferLetterService().updateOfferLetter(id, req.body);

      res.status(200).json({
        status: 'success',
        message: 'Offer letter updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteOfferLetter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.getOfferLetterService().deleteOfferLetter(id);

      res.status(200).json({
        status: 'success',
        message: 'Offer letter revoked and deleted successfully',
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
        include_company_stamp: req.body?.include_company_stamp ?? true,
        watermark: req.body?.watermark ?? false,
      };

      const { buffer, filename } = await this.getOfferLetterService().exportPdf(id, options);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };
}
