import { Request, Response, NextFunction } from 'express';
import { Container } from '@shared/di/index';
import { ProposalService } from '../../application/services/proposal.service';

export class ProposalController {
  private getProposalService(): ProposalService {
    return Container.resolve<ProposalService>('ProposalService');
  }

  listProposals = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const { status, start_date, end_date, search, page, limit } = req.query as Record<
        string,
        string | undefined
      >;

      const result = await this.getProposalService().listProposals(
        companyId,
        { status, start_date, end_date, search },
        {
          page: page ? parseInt(page, 10) : 1,
          limit: limit ? parseInt(limit, 10) : 20,
        },
      );

      res.status(200).json({
        success: true,
        status: 'success',
        meta: result.meta,
        data: result.proposals,
      });
    } catch (error) {
      next(error);
    }
  };

  getProposalById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const proposal = await this.getProposalService().getProposalById(id);
      const formatted = this.getProposalService().formatQuotationDetail(proposal);

      res.status(200).json({
        success: true,
        status: 'success',
        data: formatted,
      });
    } catch (error) {
      next(error);
    }
  };

  createProposal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const createdBy = (req.user as any)?.name || req.user?.email || 'Skyfall International Team';

      const proposal = await this.getProposalService().createProposal(
        companyId,
        req.body,
        createdBy,
      );

      const isProposalRoute = req.originalUrl.includes('/proposals');
      const message = isProposalRoute
        ? 'Quotation proposal generated successfully'
        : 'Quotation generated successfully';

      res.status(201).json({
        success: true,
        status: 'success',
        message,
        data: proposal,
      });
    } catch (error) {
      next(error);
    }
  };

  updateProposal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const proposal = await this.getProposalService().updateProposal(id, req.body);

      const isProposalRoute = req.originalUrl.includes('/proposals');
      const message = isProposalRoute
        ? 'Proposal updated successfully'
        : 'Quotation updated successfully';

      res.status(200).json({
        success: true,
        status: 'success',
        message,
        data: proposal,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteProposal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.getProposalService().deleteProposal(id);

      const isProposalRoute = req.originalUrl.includes('/proposals');
      const message = isProposalRoute
        ? 'Proposal deleted successfully'
        : 'Quotation deleted successfully';

      res.status(200).json({
        success: true,
        status: 'success',
        message,
      });
    } catch (error) {
      next(error);
    }
  };

  sendEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { recipient_email, cc_emails, custom_message } = req.body;

      const result = await this.getProposalService().sendProposalEmail(
        id,
        recipient_email,
        cc_emails,
        custom_message,
      );

      res.status(200).json({
        success: true,
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };

  downloadPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { buffer, filename } = await this.getProposalService().generatePdf(id);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };

  convertToInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const companyId = req.companyId as string | undefined;

      const invoiceData = await this.getProposalService().convertToInvoice(id, companyId);

      res.status(201).json({
        success: true,
        status: 'success',
        message: 'Proposal converted to Tax Invoice successfully',
        data: invoiceData,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const QuotationController = ProposalController;
