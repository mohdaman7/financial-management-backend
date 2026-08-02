import { Types } from 'mongoose';
import { AttendanceRepository } from '../../infrastructure/repositories/attendance.repository';
import { IAttendance } from '../../infrastructure/models/Attendance.model';
import { AppError } from '@shared/errors/AppError';

export class AttendanceService {
  constructor(private attendanceRepository: AttendanceRepository) {}

  private getTodayDateStr(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  }

  async clockIn(userId: string, companyId: string): Promise<IAttendance> {
    const todayStr = this.getTodayDateStr();

    const existing = await this.attendanceRepository.findTodayRecord(userId, todayStr);
    if (existing) {
      throw AppError.conflict('You have already clocked in for today');
    }

    const now = new Date();
    // Enforce 9:00 AM cutoff for late check-in
    const cutoff = new Date(now);
    cutoff.setHours(9, 0, 0, 0);

    const isLate = now.getTime() > cutoff.getTime();

    return this.attendanceRepository.create({
      userId: new Types.ObjectId(userId),
      companyId: new Types.ObjectId(companyId),
      date: todayStr,
      clockIn: now,
      isLate,
    });
  }

  async clockOut(userId: string): Promise<IAttendance> {
    const todayStr = this.getTodayDateStr();

    const record = await this.attendanceRepository.findTodayRecord(userId, todayStr);
    if (!record) {
      throw AppError.notFound('No clock-in record found for today');
    }

    if (record.clockOut) {
      throw AppError.conflict('You have already clocked out for today');
    }

    const now = new Date();
    const diffMs = now.getTime() - record.clockIn.getTime();
    const workingHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    const updated = await this.attendanceRepository.update(record._id.toString(), {
      clockOut: now,
      workingHours,
    });

    if (!updated) {
      throw AppError.notFound('Failed to update attendance record');
    }

    return updated;
  }

  async getTodayStatus(userId: string): Promise<IAttendance | null> {
    const todayStr = this.getTodayDateStr();
    return this.attendanceRepository.findTodayRecord(userId, todayStr);
  }

  async getPersonalHistory(
    userId: string,
    startDateStr: string,
    endDateStr: string,
  ): Promise<IAttendance[]> {
    return this.attendanceRepository.findByUserAndDateRange(userId, startDateStr, endDateStr);
  }

  async getMonthlySummary(
    userId: string,
    yearMonthStr: string, // YYYY-MM
  ): Promise<{
    presentDays: number;
    lateDays: number;
    totalHours: number;
    records: IAttendance[];
  }> {
    const records = await this.attendanceRepository.findByUserMonthly(userId, yearMonthStr);
    const presentDays = records.length;
    const lateDays = records.filter((r) => r.isLate).length;
    const totalHours = parseFloat(
      records.reduce((acc, r) => acc + (r.workingHours || 0), 0).toFixed(2),
    );

    return {
      presentDays,
      lateDays,
      totalHours,
      records,
    };
  }

  async getCompanyDailyReport(companyId: string, dateStr: string): Promise<IAttendance[]> {
    return this.attendanceRepository.findByCompanyAndDate(companyId, dateStr);
  }
}
