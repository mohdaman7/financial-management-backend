import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { authenticate, authorizeCompany } from '@shared/middleware/auth.middleware';
import { uploadMemory } from '@shared/middleware/gridfs.middleware';

const router = Router();
const controller = new DocumentController();

router.post(
  '/upload',
  authenticate,
  authorizeCompany,
  uploadMemory.single('file'),
  controller.upload,
);

router.get('/:fileId', authenticate, authorizeCompany, controller.download);
router.delete('/:fileId', authenticate, authorizeCompany, controller.delete);

export default router;
