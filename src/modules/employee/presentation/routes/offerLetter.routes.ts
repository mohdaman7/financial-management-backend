import { Router, Request, Response, NextFunction } from 'express';
import { OfferLetterController } from '../controllers/offerLetter.controller';
import { validate } from '@shared/middleware/validate.middleware';
import {
  authenticate,
  authorizeCompany,
  requireSuperAdmin,
} from '@shared/middleware/auth.middleware';
import {
  createOfferLetterSchema,
  updateOfferLetterSchema,
  exportOfferLetterPdfSchema,
} from '../validators/offerLetter.validator';
import { AppError } from '@shared/errors/AppError';

const router = Router();
const controller = new OfferLetterController();

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
    user.permissions.includes('manage_employees') ||
    user.permissions.includes('manage_travel') ||
    user.permissions.includes('manage_finance') ||
    user.permissions.includes('generate_invoices') ||
    user.permissions.includes('*');

  if (!hasAdminPerm) {
    next(
      AppError.forbidden(
        'Insufficient permissions to update offer letter. Admin or Super Admin access required.',
        'PERMISSION_DENIED',
      ),
    );
    return;
  }
  next();
};

/**
 * @openapi
 * /offer-letters:
 *   post:
 *     tags:
 *       - Generate Offer Letter API
 *     summary: Generate a new official employment offer letter
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  authenticate,
  authorizeCompany,
  validate(createOfferLetterSchema),
  controller.createOfferLetter,
);

/**
 * @openapi
 * /offer-letters:
 *   get:
 *     tags:
 *       - Generate Offer Letter API
 *     summary: List generated offer letters with search & date filters
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, authorizeCompany, controller.listOfferLetters);

/**
 * @openapi
 * /offer-letters/{id}:
 *   get:
 *     tags:
 *       - Generate Offer Letter API
 *     summary: Fetch offer letter by ID with complete candidate bio
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, authorizeCompany, controller.getOfferLetterById);

/**
 * @openapi
 * /offer-letters/{id}:
 *   put:
 *     tags:
 *       - Generate Offer Letter API
 *     summary: Update offer letter terms or candidate details
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/:id',
  authenticate,
  authorizeCompany,
  requireAdminOrSuperAdmin,
  validate(updateOfferLetterSchema),
  controller.updateOfferLetter,
);

/**
 * @openapi
 * /offer-letters/{id}:
 *   delete:
 *     tags:
 *       - Generate Offer Letter API
 *     summary: Revoke or delete an offer letter
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:id',
  authenticate,
  authorizeCompany,
  requireSuperAdmin,
  controller.deleteOfferLetter,
);

/**
 * @openapi
 * /offer-letters/{id}/pdf:
 *   post:
 *     tags:
 *       - Generate Offer Letter API
 *     summary: Render & export official Offer Letter PDF document
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/:id/pdf',
  authenticate,
  authorizeCompany,
  validate(exportOfferLetterPdfSchema),
  controller.exportPdf,
);

/**
 * @openapi
 * /offer-letters/{id}/pdf:
 *   get:
 *     tags:
 *       - Generate Offer Letter API
 *     summary: Render & export official Offer Letter PDF document (GET fallback)
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/pdf', authenticate, authorizeCompany, controller.exportPdf);

export default router;
