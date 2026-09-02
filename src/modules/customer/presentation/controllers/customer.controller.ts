import { Request, Response, NextFunction } from 'express';
import { Container } from '@shared/di/index';
import { CustomerService } from '../../application/services/customer.service';
import { ResponseFormatter } from '@shared/utils/responseFormatter';
import { AppError } from '@shared/errors/AppError';
import { getGridFSBucket } from '@shared/middleware/gridfs.middleware';
import { Readable } from 'stream';

export class CustomerController {
  private getCustomerService(): CustomerService {
    return Container.resolve<CustomerService>('CustomerService');
  }

  listCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const { status, priority, lead_source, assigned_employee_id, search, page, limit } =
        req.query as Record<string, string | undefined>;

      const result = await this.getCustomerService().listCustomers(
        companyId,
        {
          status,
          priority,
          lead_source,
          assigned_employee_id,
          search,
        },
        {
          page: page ? parseInt(page, 10) : 1,
          limit: limit ? parseInt(limit, 10) : 20,
        },
      );

      res.status(200).json(ResponseFormatter.success(result.customers, result.meta));
    } catch (error) {
      next(error);
    }
  };

  getCustomerById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const companyId = req.user?.isSuperAdmin ? undefined : (req.companyId as string | undefined);
      const customer = await this.getCustomerService().getCustomerById(id, companyId);
      res.status(200).json(ResponseFormatter.success(customer));
    } catch (error) {
      next(error);
    }
  };

  createCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string | undefined;
      const performedBy = (req.user as any)?.name || req.user?.email || 'System';

      const customer = await this.getCustomerService().createCustomer(
        companyId,
        req.body,
        performedBy,
      );

      res.status(201).json({
        success: true,
        message: 'Customer profile created successfully',
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  };

  updateCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const companyId = req.user?.isSuperAdmin ? undefined : (req.companyId as string | undefined);
      const performedBy = (req.user as any)?.name || req.user?.email || 'System';

      const customer = await this.getCustomerService().updateCustomer(
        id,
        req.body,
        performedBy,
        companyId,
      );

      res.status(200).json({
        success: true,
        message: 'Customer profile updated successfully',
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const companyId = req.user?.isSuperAdmin ? undefined : (req.companyId as string | undefined);
      await this.getCustomerService().deleteCustomer(id, companyId);

      res.status(200).json({
        success: true,
        message: 'Customer profile deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  listDocuments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const companyId = req.user?.isSuperAdmin ? undefined : (req.companyId as string | undefined);
      const documents = await this.getCustomerService().listDocuments(id, companyId);
      res.status(200).json(ResponseFormatter.success(documents));
    } catch (error) {
      next(error);
    }
  };

  uploadDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const customerId = req.params.id as string;
      const companyId = req.user?.isSuperAdmin ? undefined : (req.companyId as string | undefined);
      const performedBy = (req.user as any)?.name || req.user?.email || 'System';

      if (!req.file) {
        throw AppError.badRequest('No document file uploaded');
      }

      const documentType = req.body.document_type || req.body.type || 'Other';
      const title = req.body.title || req.file.originalname;

      // Upload file buffer to GridFS
      const bucket = getGridFSBucket();
      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        metadata: {
          contentType: req.file.mimetype,
          uploadedBy: req.user?.id,
          customerId,
          companyId: req.companyId,
          documentType,
        },
      });

      const readableStream = new Readable();
      readableStream.push(req.file.buffer);
      readableStream.push(null);

      readableStream.pipe(uploadStream);

      uploadStream.on('finish', async () => {
        try {
          const fileId = uploadStream.id.toString();
          const fileUrl = `/api/v1/documents/${fileId}`;

          const doc = await this.getCustomerService().addDocument(
            customerId,
            {
              name: title,
              type: documentType,
              file_url: fileUrl,
              fileId,
              size_bytes: req.file?.size || 0,
              status: 'verified',
            },
            performedBy,
            companyId,
          );

          res.status(201).json({
            success: true,
            message: 'Document uploaded to vault successfully',
            data: doc,
          });
        } catch (err) {
          next(err);
        }
      });

      uploadStream.on('error', (err) => {
        next(err);
      });
    } catch (error) {
      next(error);
    }
  };

  deleteDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const customerId = req.params.id as string;
      const docId = req.params.docId as string;
      const companyId = req.user?.isSuperAdmin ? undefined : (req.companyId as string | undefined);
      const performedBy = (req.user as any)?.name || req.user?.email || 'System';

      await this.getCustomerService().deleteDocument(customerId, docId, performedBy, companyId);

      res.status(200).json({
        success: true,
        message: 'Document deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getActivityLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const companyId = req.user?.isSuperAdmin ? undefined : (req.companyId as string | undefined);
      const activityLog = await this.getCustomerService().getActivityLog(id, companyId);
      res.status(200).json(ResponseFormatter.success(activityLog));
    } catch (error) {
      next(error);
    }
  };
}
