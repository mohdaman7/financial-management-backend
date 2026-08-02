import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller';
import { validate } from '@shared/middleware/validate.middleware';
import {
  authenticate,
  requirePermission,
  authorizeCompany,
} from '@shared/middleware/auth.middleware';
import {
  historyQuerySchema,
  summaryQuerySchema,
  reportQuerySchema,
} from '../validators/attendance.validator';

const router = Router();
const controller = new AttendanceController();

/**
 * @openapi
 * /attendance/clock-in:
 *   post:
 *     tags:
 *       - Attendance
 *     summary: Clock in for the day
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       210:
 *         description: Clock-in logged
 */
router.post('/clock-in', authenticate, authorizeCompany, controller.clockIn);

/**
 * @openapi
 * /attendance/clock-out:
 *   post:
 *     tags:
 *       - Attendance
 *     summary: Clock out for the day
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Clock-out logged and hours calculated
 */
router.post('/clock-out', authenticate, authorizeCompany, controller.clockOut);

/**
 * @openapi
 * /attendance/status:
 *   get:
 *     tags:
 *       - Attendance
 *     summary: Get today's attendance status for the logged-in user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's record (or null if not clocked in)
 */
router.get('/status', authenticate, controller.getStatus);

/**
 * @openapi
 * /attendance/history:
 *   get:
 *     tags:
 *       - Attendance
 *     summary: Get personal attendance history for a date range
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of records
 */
router.get('/history', authenticate, validate(historyQuerySchema, 'query'), controller.getHistory);

/**
 * @openapi
 * /attendance/summary:
 *   get:
 *     tags:
 *       - Attendance
 *     summary: Get monthly summary statistics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *           placeholder: YYYY-MM
 *     responses:
 *       200:
 *         description: Statistics summary
 */
router.get(
  '/summary',
  authenticate,
  validate(summaryQuerySchema, 'query'),
  controller.getMonthlySummary,
);

/**
 * @openapi
 * /attendance/report:
 *   get:
 *     tags:
 *       - Attendance
 *     summary: Get daily attendance report for the whole company (requires view_employees permission)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           placeholder: YYYY-MM-DD
 *     responses:
 *       200:
 *         description: List of company logs
 */
router.get(
  '/report',
  authenticate,
  requirePermission('view_employees'),
  authorizeCompany,
  validate(reportQuerySchema, 'query'),
  controller.getCompanyReport,
);

export default router;
