import { AttendanceModel, IAttendance } from '../models/Attendance.model';

export class AttendanceRepository {
  async findTodayRecord(userId: string, dateStr: string): Promise<IAttendance | null> {
    return AttendanceModel.findOne({ userId, date: dateStr }).exec();
  }

  async findByUserAndDateRange(
    userId: string,
    startDateStr: string,
    endDateStr: string,
  ): Promise<IAttendance[]> {
    return AttendanceModel.find({
      userId,
      date: { $gte: startDateStr, $lte: endDateStr },
    })
      .sort({ date: 1 })
      .exec();
  }

  async findByCompanyAndDate(companyId: string, dateStr: string): Promise<IAttendance[]> {
    return AttendanceModel.find({ companyId, date: dateStr }).populate('userId').exec();
  }

  async findByUserMonthly(userId: string, yearMonthStr: string): Promise<IAttendance[]> {
    // Matches YYYY-MM
    return AttendanceModel.find({
      userId,
      date: new RegExp(`^${yearMonthStr}`),
    })
      .sort({ date: 1 })
      .exec();
  }

  async create(data: Partial<IAttendance>): Promise<IAttendance> {
    const record = new AttendanceModel(data);
    return record.save();
  }

  async update(id: string, data: Partial<IAttendance>): Promise<IAttendance | null> {
    return AttendanceModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }
}
