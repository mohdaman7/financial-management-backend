import { Router } from 'express';
import { LeadOwnerController } from '../controllers/lead_owner.controller';
import { validate } from '@shared/middleware/validate.middleware';
import {
  authenticate,
  requirePermission,
  authorizeCompany,
} from '@shared/middleware/auth.middleware';
import { createLeadOwnerSchema, updateLeadOwnerSchema } from '../validators/lead_owner.validator';

const router = Router();
const controller = new LeadOwnerController();

// We'll use the same permission requirements as employees for now, or maybe generic ones
// The instructions don't specify, but authenticate and authorizeCompany is a safe baseline.

router.post(
  '/',
  authenticate,
  authorizeCompany,
  validate(createLeadOwnerSchema),
  controller.create,
);

router.get(
  '/',
  authenticate,
  authorizeCompany,
  controller.list,
);

router.get(
  '/:id',
  authenticate,
  authorizeCompany,
  controller.getById,
);

router.put(
  '/:id',
  authenticate,
  authorizeCompany,
  validate(updateLeadOwnerSchema),
  controller.update,
);

router.delete(
  '/:id',
  authenticate,
  authorizeCompany,
  controller.delete,
);

export default router;
