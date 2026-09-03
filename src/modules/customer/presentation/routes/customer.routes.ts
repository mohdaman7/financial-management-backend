import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { authenticate, authorizeCompany } from '@shared/middleware/auth.middleware';
import { uploadMemory } from '@shared/middleware/gridfs.middleware';
import { validate } from '@shared/middleware/validate.middleware';
import {
  customerLedgerQuerySchema,
  allocateCreditSchema,
} from '../validators/customer.validator';

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

// Customer Financial Summary & Ledger
router.get('/:id/financial-summary', authenticate, authorizeCompany, controller.getFinancialSummary);
router.get(
  '/:id/ledger',
  authenticate,
  authorizeCompany,
  validate(customerLedgerQuerySchema, 'query'),
  controller.getLedger,
);
router.post(
  '/:id/allocate-credit',
  authenticate,
  authorizeCompany,
  validate(allocateCreditSchema, 'body'),
  controller.allocateCredit,
);

export default router;

