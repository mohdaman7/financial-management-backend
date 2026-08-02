import { Request, Response, NextFunction } from 'express';
import { Container } from '@shared/di/index';
import { AttendanceService } from '../../application/services/attendance.service';
import { ResponseFormatter } from '@shared/utils/responseFormatter';

export class AttendanceController {
  private getAttendanceService(): AttendanceService {
    return Container.resolve<AttendanceService>('AttendanceService');
  }

  clockIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id as string;
      const companyId = req.companyId as string;

      const record = await this.getAttendanceService().clockIn(userId, companyId);
      res.status(201).json(ResponseFormatter.success(record));
    } catch (error) {
      next(error);
    }
  };

  clockOut = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id as string;

      const record = await this.getAttendanceService().clockOut(userId);
      res.status(200).json(ResponseFormatter.success(record));
    } catch (error) {
      next(error);
    }
  };

  getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id as string;
      const record = await this.getAttendanceService().getTodayStatus(userId);
      res.status(200).json(ResponseFormatter.success(record));
    } catch (error) {
      next(error);
    }
  };

  getHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id as string;
      const { startDate, endDate } = req.query as { startDate: string; endDate: string };

      const records = await this.getAttendanceService().getPersonalHistory(
        userId,
        startDate,
        endDate,
      );
      res.status(200).json(ResponseFormatter.success(records));
    } catch (error) {
      next(error);
    }
  };

  getMonthlySummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id as string;
      const { month } = req.query as { month: string };

      const summary = await this.getAttendanceService().getMonthlySummary(userId, month);
      res.status(200).json(ResponseFormatter.success(summary));
    } catch (error) {
      next(error);
    }
  };

  getCompanyReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

      const records = await this.getAttendanceService().getCompanyDailyReport(companyId, date);
      res.status(200).json(ResponseFormatter.success(records));
    } catch (error) {
      next(error);
    }
  };
}
