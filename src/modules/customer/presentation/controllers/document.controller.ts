import { Request, Response, NextFunction } from 'express';
import { getGridFSBucket } from '@shared/middleware/gridfs.middleware';
import { Types } from 'mongoose';
import { Readable } from 'stream';
import { ResponseFormatter } from '@shared/utils/responseFormatter';
import { AppError } from '@shared/errors/AppError';

export class DocumentController {
  upload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        throw AppError.badRequest('No file uploaded');
      }

      const bucket = getGridFSBucket();
      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        metadata: {
          contentType: req.file.mimetype,
          uploadedBy: req.user?.id,
          companyId: req.companyId,
        },
      });

      const readableStream = new Readable();
      readableStream.push(req.file.buffer);
      readableStream.push(null);

      readableStream.pipe(uploadStream);

      uploadStream.on('finish', () => {
        res.status(201).json(
          ResponseFormatter.success({
            fileId: uploadStream.id.toString(),
            filename: req.file?.originalname,
            contentType: req.file?.mimetype,
          }),
        );
      });

      uploadStream.on('error', (err) => {
        next(err);
      });
    } catch (error) {
      next(error);
    }
  };

  download = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const fileId = req.params.fileId as string;
      if (!Types.ObjectId.isValid(fileId)) {
        throw AppError.badRequest('Invalid document ID');
      }

      const bucket = getGridFSBucket();
      const objectId = new Types.ObjectId(fileId);

      const files = await bucket.find({ _id: objectId }).toArray();
      if (!files || files.length === 0) {
        throw AppError.notFound('Document not found');
      }

      const fileMetadata = files[0];
      const fileCompanyId = fileMetadata.metadata?.companyId?.toString();

      // Enforce strict multi-company tenant isolation
      if (
        !req.user?.isSuperAdmin &&
        fileCompanyId &&
        req.companyId &&
        fileCompanyId !== req.companyId.toString()
      ) {
        throw AppError.forbidden(
          'Access denied: Document belongs to another company context',
          'CROSS_COMPANY_FORBIDDEN',
        );
      }

      const contentType = fileMetadata.metadata?.contentType || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${fileMetadata.filename}"`);

      const downloadStream = bucket.openDownloadStream(objectId);
      downloadStream.pipe(res);

      downloadStream.on('error', (err) => {
        next(err);
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const fileId = req.params.fileId as string;
      if (!Types.ObjectId.isValid(fileId)) {
        throw AppError.badRequest('Invalid document ID');
      }

      const bucket = getGridFSBucket();
      const objectId = new Types.ObjectId(fileId);

      const files = await bucket.find({ _id: objectId }).toArray();
      if (!files || files.length === 0) {
        throw AppError.notFound('Document not found');
      }

      const fileMetadata = files[0];
      const fileCompanyId = fileMetadata.metadata?.companyId?.toString();

      // Enforce strict multi-company tenant isolation on deletion
      if (
        !req.user?.isSuperAdmin &&
        fileCompanyId &&
        req.companyId &&
        fileCompanyId !== req.companyId.toString()
      ) {
        throw AppError.forbidden(
          'Access denied: Document belongs to another company context',
          'CROSS_COMPANY_FORBIDDEN',
        );
      }

      await bucket.delete(objectId);
      res.status(200).json(ResponseFormatter.success({ message: 'Document deleted successfully' }));
    } catch (error) {
      next(error);
    }
  };
}
