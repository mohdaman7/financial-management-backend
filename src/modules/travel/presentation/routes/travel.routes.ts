import { Router } from 'express';
import { TravelController } from '../controllers/travel.controller';
import { validate } from '@shared/middleware/validate.middleware';
import {
  authenticate,
  requirePermission,
  authorizeCompany,
} from '@shared/middleware/auth.middleware';
import {
  createCustomerSchema,
  createBookingSchema,
  createProposalSchema,
  updateProposalStatusSchema,
} from '../validators/travel.validator';

const router = Router();
const controller = new TravelController();

// --- Customers ---
router.post(
  '/customers',
  authenticate,
  requirePermission('manage_travel'),
  authorizeCompany,
  validate(createCustomerSchema),
  controller.createCustomer,
);

router.get(
  '/customers',
  authenticate,
  requirePermission('view_travel'),
  authorizeCompany,
  controller.listCustomers,
);

router.get(
  '/customers/:id',
  authenticate,
  requirePermission('view_travel'),
  authorizeCompany,
  controller.getCustomerById,
);

router.put(
  '/customers/:id',
  authenticate,
  requirePermission('manage_travel'),
  authorizeCompany,
  controller.updateCustomer,
);

router.delete(
  '/customers/:id',
  authenticate,
  requirePermission('manage_travel'),
  authorizeCompany,
  controller.deleteCustomer,
);

// --- Bookings ---
router.post(
  '/bookings',
  authenticate,
  requirePermission('manage_travel'),
  authorizeCompany,
  validate(createBookingSchema),
  controller.createBooking,
);

router.get(
  '/bookings',
  authenticate,
  requirePermission('view_travel'),
  authorizeCompany,
  controller.listBookings,
);

router.get(
  '/bookings/:id',
  authenticate,
  requirePermission('view_travel'),
  authorizeCompany,
  controller.getBookingById,
);

router.put(
  '/bookings/:id',
  authenticate,
  requirePermission('manage_travel'),
  authorizeCompany,
  controller.updateBooking,
);

router.delete(
  '/bookings/:id',
  authenticate,
  requirePermission('manage_travel'),
  authorizeCompany,
  controller.deleteBooking,
);

// --- Proposals ---
router.post(
  '/proposals',
  authenticate,
  requirePermission('manage_travel'),
  authorizeCompany,
  validate(createProposalSchema),
  controller.createProposal,
);

router.get(
  '/proposals',
  authenticate,
  requirePermission('view_travel'),
  authorizeCompany,
  controller.listProposals,
);

router.get(
  '/proposals/:id',
  authenticate,
  requirePermission('view_travel'),
  authorizeCompany,
  controller.getProposalById,
);

router.put(
  '/proposals/:id/status',
  authenticate,
  requirePermission('manage_travel'),
  authorizeCompany,
  validate(updateProposalStatusSchema),
  controller.updateProposalStatus,
);

router.delete(
  '/proposals/:id',
  authenticate,
  requirePermission('manage_travel'),
  authorizeCompany,
  controller.deleteProposal,
);



export default router;
