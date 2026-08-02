import { Router } from 'express';
import { ImportController } from '../controllers/import.controller';
import { authenticate, authorizeCompany } from '@shared/middleware/auth.middleware';
import { uploadMemory } from '@shared/middleware/gridfs.middleware';

const router = Router();
const controller = new ImportController();

router.post(
  '/customers',
  authenticate,
  authorizeCompany,
  uploadMemory.single('file'),
  controller.importCustomers,
);

router.post(
  '/transactions',
  authenticate,
  authorizeCompany,
  uploadMemory.single('file'),
  controller.importTransactions,
);

export default router;
