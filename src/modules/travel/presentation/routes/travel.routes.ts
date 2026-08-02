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
  recordPaymentSchema,
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

router.put(
  '/proposals/:id/status',
  authenticate,
  requirePermission('manage_travel'),
  authorizeCompany,
  validate(updateProposalStatusSchema),
  controller.updateProposalStatus,
);

// --- Invoices & Payments ---
router.get(
  '/invoices',
  authenticate,
  requirePermission('view_travel'),
  authorizeCompany,
  controller.listInvoices,
);

router.post(
  '/invoices/:id/payments',
  authenticate,
  requirePermission('manage_travel'),
  authorizeCompany,
  validate(recordPaymentSchema),
  controller.recordPayment,
);

export default router;
