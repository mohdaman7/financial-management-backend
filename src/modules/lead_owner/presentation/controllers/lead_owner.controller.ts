import { Request, Response, NextFunction } from 'express';
import { LeadOwnerService } from '../../application/services/lead_owner.service';

export class LeadOwnerController {
  private service: LeadOwnerService;

  constructor() {
    this.service = new LeadOwnerService();
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = (req.companyId as string) || '000000000000000000000000';
      const data = { ...req.body, company_id: companyId };
      const leadOwner = await this.service.createLeadOwner(data);
      res.status(201).json({ success: true, data: leadOwner });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = (req.companyId as string) || '000000000000000000000000';
      const leadOwners = await this.service.getLeadOwners(companyId);
      res.status(200).json({ success: true, data: leadOwners });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = (req.companyId as string) || '000000000000000000000000';
      const leadOwner = await this.service.getLeadOwnerById(req.params.id as string, companyId);
      res.status(200).json({ success: true, data: leadOwner });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = (req.companyId as string) || '000000000000000000000000';
      const leadOwner = await this.service.updateLeadOwner(req.params.id as string, companyId, req.body);
      res.status(200).json({ success: true, data: leadOwner });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = (req.companyId as string) || '000000000000000000000000';
      await this.service.deleteLeadOwner(req.params.id as string, companyId);
      res.status(200).json({ success: true, message: 'Lead Owner deleted successfully' });
    } catch (error) {
      next(error);
    }
  };
}
