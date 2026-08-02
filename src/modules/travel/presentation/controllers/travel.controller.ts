import { Request, Response, NextFunction } from 'express';
import { Container } from '@shared/di/index';
import { TravelService } from '../../application/services/travel.service';
import { ResponseFormatter } from '@shared/utils/responseFormatter';

export class TravelController {
  private getTravelService(): TravelService {
    return Container.resolve<TravelService>('TravelService');
  }

  // --- Customers ---
  createCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const customer = await this.getTravelService().createCustomer(companyId, req.body);
      res.status(201).json(ResponseFormatter.success(customer));
    } catch (error) {
      next(error);
    }
  };

  listCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const customers = await this.getTravelService().getCustomers(companyId);
      res.status(200).json(ResponseFormatter.success(customers));
    } catch (error) {
      next(error);
    }
  };

  // --- Bookings ---
  createBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const booking = await this.getTravelService().createBooking(companyId, req.body);
      res.status(201).json(ResponseFormatter.success(booking));
    } catch (error) {
      next(error);
    }
  };

  listBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const { status } = req.query as { status?: string };

      const bookings = await this.getTravelService().getBookings(companyId, { status });
      res.status(200).json(ResponseFormatter.success(bookings));
    } catch (error) {
      next(error);
    }
  };

  getBookingById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const booking = await this.getTravelService().getBookingById(id);
      res.status(200).json(ResponseFormatter.success(booking));
    } catch (error) {
      next(error);
    }
  };

  // --- Proposals ---
  createProposal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const proposal = await this.getTravelService().generateProposal(companyId, req.body);
      res.status(201).json(ResponseFormatter.success(proposal));
    } catch (error) {
      next(error);
    }
  };

  listProposals = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const proposals = await this.getTravelService().getProposals(companyId);
      res.status(200).json(ResponseFormatter.success(proposals));
    } catch (error) {
      next(error);
    }
  };

  updateProposalStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { status } = req.body as { status: 'draft' | 'sent' | 'approved' | 'rejected' };

      const proposal = await this.getTravelService().updateProposalStatus(id, status);
      res.status(200).json(ResponseFormatter.success(proposal));
    } catch (error) {
      next(error);
    }
  };

  // --- Invoices ---
  listInvoices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const invoices = await this.getTravelService().getInvoices(companyId);
      res.status(200).json(ResponseFormatter.success(invoices));
    } catch (error) {
      next(error);
    }
  };

  recordPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const invoice = await this.getTravelService().recordPayment(id, req.body);
      res.status(200).json(ResponseFormatter.success(invoice));
    } catch (error) {
      next(error);
    }
  };
}
