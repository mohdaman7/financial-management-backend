import { Router, Request, Response, NextFunction } from 'express';
import { ProposalController } from '../controllers/proposal.controller';
import {
  authenticate,
  authorizeCompany,
  requireSuperAdmin,
} from '@shared/middleware/auth.middleware';
import { validate } from '@shared/middleware/validate.middleware';
import {
  createQuotationSchema,
  updateQuotationSchema,
  exportQuotationPdfSchema,
} from '../validators/quotation.validator';
import { AppError } from '@shared/errors/AppError';

const router = Router();
const controller = new ProposalController();

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
    user.permissions.includes('manage_travel') ||
    user.permissions.includes('manage_employees') ||
    user.permissions.includes('manage_finance') ||
    user.permissions.includes('generate_invoices') ||
    user.permissions.includes('*');

  if (!hasAdminPerm) {
    next(
      AppError.forbidden(
        'Insufficient permissions to update quotation. Admin or Super Admin access required.',
        'PERMISSION_DENIED',
      ),
    );
    return;
  }
  next();
};

/**
 * @openapi
 * /quotations:
 *   post:
 *     tags:
 *       - Generate Quotation API
 *     summary: Create and generate a new price quotation
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  authenticate,
  authorizeCompany,
  validate(createQuotationSchema),
  controller.createProposal,
);

/**
 * @openapi
 * /quotations:
 *   get:
 *     tags:
 *       - Generate Quotation API
 *     summary: List quotations with search, date range & status filters
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, authorizeCompany, controller.listProposals);

/**
 * @openapi
 * /quotations/{id}:
 *   get:
 *     tags:
 *       - Generate Quotation API
 *     summary: Fetch quotation details by ID with line items
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, authorizeCompany, controller.getProposalById);

/**
 * @openapi
 * /quotations/{id}:
 *   put:
 *     tags:
 *       - Generate Quotation API
 *     summary: Update an existing quotation
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/:id',
  authenticate,
  authorizeCompany,
  requireAdminOrSuperAdmin,
  validate(updateQuotationSchema),
  controller.updateProposal,
);

/**
 * @openapi
 * /quotations/{id}:
 *   delete:
 *     tags:
 *       - Generate Quotation API
 *     summary: Delete or cancel a quotation
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:id',
  authenticate,
  authorizeCompany,
  requireSuperAdmin,
  controller.deleteProposal,
);

/**
 * @openapi
 * /quotations/{id}/pdf:
 *   post:
 *     tags:
 *       - Generate Quotation API
 *     summary: Render & export official Quotation PDF document
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/:id/pdf',
  authenticate,
  authorizeCompany,
  validate(exportQuotationPdfSchema),
  controller.downloadPdf,
);

/**
 * @openapi
 * /quotations/{id}/pdf:
 *   get:
 *     tags:
 *       - Generate Quotation API
 *     summary: Render & export official Quotation PDF document (GET fallback)
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/pdf', authenticate, authorizeCompany, controller.downloadPdf);

/**
 * Additional proposal workflow endpoints
 */
router.post('/:id/send-email', authenticate, authorizeCompany, controller.sendEmail);
router.post(
  '/:id/convert-to-invoice',
  authenticate,
  authorizeCompany,
  controller.convertToInvoice,
);

export default router;
