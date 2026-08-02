import { Router } from 'express';
import { FinanceController } from '../controllers/finance.controller';
import { validate } from '@shared/middleware/validate.middleware';
import {
  authenticate,
  requirePermission,
  authorizeCompany,
} from '@shared/middleware/auth.middleware';
import {
  createTransactionSchema,
  updateTransactionSchema,
  reportRangeSchema,
  createBankAccountSchema,
  updateBankAccountSchema,
} from '../validators/finance.validator';

const router = Router();
const controller = new FinanceController();

// --- Bank Account Routes ---
router.post(
  '/bank-accounts',
  authenticate,
  requirePermission('manage_finance'),
  authorizeCompany,
  validate(createBankAccountSchema),
  controller.createBankAccount,
);

router.get(
  '/bank-accounts',
  authenticate,
  requirePermission('view_finance'),
  authorizeCompany,
  controller.listBankAccounts,
);

router.put(
  '/bank-accounts/:id',
  authenticate,
  requirePermission('manage_finance'),
  authorizeCompany,
  validate(updateBankAccountSchema),
  controller.updateBankAccount,
);

router.delete(
  '/bank-accounts/:id',
  authenticate,
  requirePermission('manage_finance'),
  authorizeCompany,
  controller.deleteBankAccount,
);

/**
 * @openapi
 * /finance/transactions:
 *   post:
 *     tags:
 *       - Finance & Accounting
 *     summary: Record a new transaction (requires manage_finance permission)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - category
 *               - amount
 *               - paymentMethod
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *               category:
 *                 type: string
 *               amount:
 *                 type: number
 *               taxAmount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *               reference:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transaction logged successfully
 */
router.post(
  '/transactions',
  authenticate,
  requirePermission('manage_finance'),
  authorizeCompany,
  validate(createTransactionSchema),
  controller.create,
);

/**
 * @openapi
 * /finance/transactions:
 *   get:
 *     tags:
 *       - Finance & Accounting
 *     summary: Retrieve company ledger transactions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transactions ledger
 */
router.get(
  '/transactions',
  authenticate,
  requirePermission('view_finance'),
  authorizeCompany,
  controller.list,
);

/**
 * @openapi
 * /finance/transactions/{id}:
 *   get:
 *     tags:
 *       - Finance & Accounting
 *     summary: Get transaction details by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaction object
 *       404:
 *         description: Transaction not found
 */
router.get(
  '/transactions/:id',
  authenticate,
  requirePermission('view_finance'),
  authorizeCompany,
  controller.getById,
);

/**
 * @openapi
 * /finance/transactions/{id}:
 *   put:
 *     tags:
 *       - Finance & Accounting
 *     summary: Update transaction details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Transaction updated
 */
router.put(
  '/transactions/:id',
  authenticate,
  requirePermission('manage_finance'),
  authorizeCompany,
  validate(updateTransactionSchema),
  controller.update,
);

/**
 * @openapi
 * /finance/transactions/{id}:
 *   delete:
 *     tags:
 *       - Finance & Accounting
 *     summary: Delete transaction record
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaction deleted
 */
router.delete(
  '/transactions/:id',
  authenticate,
  requirePermission('manage_finance'),
  authorizeCompany,
  controller.delete,
);

/**
 * @openapi
 * /finance/reports/profit-loss:
 *   get:
 *     tags:
 *       - Finance & Accounting
 *     summary: Fetch Profit & Loss statement for date range
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           placeholder: YYYY-MM-DD
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           placeholder: YYYY-MM-DD
 *     responses:
 *       200:
 *         description: P&L Statement calculations
 */
router.get(
  '/reports/profit-loss',
  authenticate,
  requirePermission('view_finance'),
  authorizeCompany,
  validate(reportRangeSchema, 'query'),
  controller.getProfitAndLoss,
);

/**
 * @openapi
 * /finance/reports/profit-loss/export:
 *   get:
 *     tags:
 *       - Finance & Accounting
 *     summary: Export Profit & Loss statement as CSV
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *       - in: query
 *         name: endDate
 *         required: true
 *     responses:
 *       200:
 *         description: CSV file download
 */
router.get(
  '/reports/profit-loss/export',
  authenticate,
  requirePermission('view_finance'),
  authorizeCompany,
  validate(reportRangeSchema, 'query'),
  controller.exportProfitAndLoss,
);

/**
 * @openapi
 * /finance/reports/cash-flow:
 *   get:
 *     tags:
 *       - Finance & Accounting
 *     summary: Fetch Cash Flow statement for date range
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           placeholder: YYYY-MM-DD
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           placeholder: YYYY-MM-DD
 *     responses:
 *       200:
 *         description: Inflows and Outflows analysis
 */
router.get(
  '/reports/cash-flow',
  authenticate,
  requirePermission('view_finance'),
  authorizeCompany,
  validate(reportRangeSchema, 'query'),
  controller.getCashFlow,
);

/**
 * @openapi
 * /finance/reports/cash-flow/export:
 *   get:
 *     tags:
 *       - Finance & Accounting
 *     summary: Export Cash Flow statement as CSV
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *       - in: query
 *         name: endDate
 *         required: true
 *     responses:
 *       200:
 *         description: CSV file download
 */
router.get(
  '/reports/cash-flow/export',
  authenticate,
  requirePermission('view_finance'),
  authorizeCompany,
  validate(reportRangeSchema, 'query'),
  controller.exportCashFlow,
);

export default router;
