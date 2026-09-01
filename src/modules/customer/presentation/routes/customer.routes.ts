import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { authenticate, authorizeCompany } from '@shared/middleware/auth.middleware';
import { uploadMemory } from '@shared/middleware/gridfs.middleware';

const router = Router();
const controller = new CustomerController();

// Customer CRUD
router.get('/', authenticate, authorizeCompany, controller.listCustomers);
router.get('/:id', authenticate, authorizeCompany, controller.getCustomerById);
router.post('/', authenticate, authorizeCompany, controller.createCustomer);
router.put('/:id', authenticate, authorizeCompany, controller.updateCustomer);
router.delete('/:id', authenticate, authorizeCompany, controller.deleteCustomer);

// Document Vault
router.get('/:id/documents', authenticate, authorizeCompany, controller.listDocuments);
router.post(
  '/:id/documents',
  authenticate,
  authorizeCompany,
  uploadMemory.single('file'),
  controller.uploadDocument,
);
router.delete('/:id/documents/:docId', authenticate, authorizeCompany, controller.deleteDocument);

// Activity Audit Log
router.get('/:id/activity-log', authenticate, authorizeCompany, controller.getActivityLog);

export default router;
