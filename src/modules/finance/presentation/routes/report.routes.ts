import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authenticate, authorizeCompany } from '@shared/middleware/auth.middleware';

const router = Router();
const controller = new ReportController();

// ----------------------------------------------------
// 🛍️ PART 1: SALES REPORTS
// ----------------------------------------------------
router.get('/sales/proposals', authenticate, authorizeCompany, controller.getProposalsReport);
router.get('/sales/invoices', authenticate, authorizeCompany, controller.getInvoicesReport);
router.get('/sales/daily', authenticate, authorizeCompany, controller.getDailySalesReport);
router.get('/sales/monthly', authenticate, authorizeCompany, controller.getMonthlySalesReport);
router.get('/sales/by-service', authenticate, authorizeCompany, controller.getSalesByServiceReport);
router.get(
  '/sales/by-category',
  authenticate,
  authorizeCompany,
  controller.getSalesByCategoryReport,
);
router.get(
  '/sales/by-customer',
  authenticate,
  authorizeCompany,
  controller.getSalesByCustomerReport,
);
router.get('/sales/leads', authenticate, authorizeCompany, controller.getLeadsReport);
router.get('/sales/credit-notes', authenticate, authorizeCompany, controller.getCreditNotesReport);

// ----------------------------------------------------
// 💰 PART 2: FINANCE & ACCOUNTING REPORTS
// ----------------------------------------------------
router.get(
  '/finance/outstanding',
  authenticate,
  authorizeCompany,
  controller.getOutstandingInvoicesReport,
);
router.get(
  '/finance/customer-statement',
  authenticate,
  authorizeCompany,
  controller.getCustomerStatementReport,
);
router.get(
  '/finance/supplier-statement',
  authenticate,
  authorizeCompany,
  controller.getSupplierStatementReport,
);
router.get('/finance/receipts', authenticate, authorizeCompany, controller.getReceiptsReport);
router.get('/finance/expenses', authenticate, authorizeCompany, controller.getExpensesReport);
router.get(
  '/finance/profit-and-loss',
  authenticate,
  authorizeCompany,
  controller.getProfitAndLossReport,
);
router.get(
  '/finance/profit-loss',
  authenticate,
  authorizeCompany,
  controller.getProfitAndLossReport,
);
router.get('/finance/vat-return', authenticate, authorizeCompany, controller.getVatReturnReport);
router.get(
  '/finance/pro-commission',
  authenticate,
  authorizeCompany,
  controller.getProCommissionReport,
);
router.get(
  '/finance/employee-performance',
  authenticate,
  authorizeCompany,
  controller.getEmployeePerformanceReport,
);

export default router;
