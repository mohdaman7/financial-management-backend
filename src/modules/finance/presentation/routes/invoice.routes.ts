import { Router, Request, Response, NextFunction } from 'express';
import { InvoiceController } from '../controllers/invoice.controller';
import { validate } from '@shared/middleware/validate.middleware';
import {
  authenticate,
  authorizeCompany,
  requireSuperAdmin,
} from '@shared/middleware/auth.middleware';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  exportPdfSchema,
} from '../validators/invoice.validator';
import { AppError } from '@shared/errors/AppError';

const router = Router();
const controller = new InvoiceController();

const requireAdminOrSuperAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  const user = req.user;
  if (!user) {
    next(AppError.unauthorized());
    return;
  }
  if (user.isSuperAdmin) {
    next();
    return;
  }
  const hasAdminPerm =
    user.permissions.includes('generate_invoices') ||
    user.permissions.includes('manage_finance') ||
    user.permissions.includes('manage_travel') ||
    user.permissions.includes('manage_customers') ||
    user.permissions.includes('*');

  if (!hasAdminPerm) {
    next(
      AppError.forbidden('Insufficient permissions to update invoice', 'INSUFFICIENT_PERMISSIONS'),
    );
    return;
  }
  next();
};

/**
 * @openapi
 * /invoices:
 *   post:
 *     tags:
 *       - Generate Invoice API
 *     summary: Create and generate a new tax invoice
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  authenticate,
  authorizeCompany,
  validate(createInvoiceSchema),
  controller.createInvoice,
);

/**
 * @openapi
 * /invoices:
 *   get:
 *     tags:
 *       - Generate Invoice API
 *     summary: List invoices with filtering, search & pagination
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, authorizeCompany, controller.listInvoices);

/**
 * @openapi
 * /invoices/{id}:
 *   get:
 *     tags:
 *       - Generate Invoice API
 *     summary: Fetch detailed invoice by ID with line items
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, authorizeCompany, controller.getInvoiceById);

/**
 * @openapi
 * /invoices/{id}:
 *   put:
 *     tags:
 *       - Generate Invoice API
 *     summary: Update an existing invoice
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/:id',
  authenticate,
  authorizeCompany,
  requireAdminOrSuperAdmin,
  validate(updateInvoiceSchema),
  controller.updateInvoice,
);

/**
 * @openapi
 * /invoices/{id}:
 *   delete:
 *     tags:
 *       - Generate Invoice API
 *     summary: Delete or void an invoice
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authenticate, authorizeCompany, requireSuperAdmin, controller.deleteInvoice);

/**
 * @openapi
 * /invoices/{id}/pdf:
 *   post:
 *     tags:
 *       - Generate Invoice API
 *     summary: Render & export official Invoice PDF document
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/:id/pdf',
  authenticate,
  authorizeCompany,
  validate(exportPdfSchema),
  controller.exportPdf,
);

/**
 * @openapi
 * /invoices/{id}/pdf:
 *   get:
 *     tags:
 *       - Generate Invoice API
 *     summary: Render & export official Invoice PDF document (GET fallback)
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/pdf', authenticate, authorizeCompany, controller.exportPdf);

export default router;
