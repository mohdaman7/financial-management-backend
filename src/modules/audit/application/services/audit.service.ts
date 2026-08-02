import { AuditLogModel, IAuditLog } from '../../infrastructure/models/AuditLog.model';
import { Types } from 'mongoose';

export class AuditService {
  async log(data: {
    companyId?: string;
    userId?: string;
    action: string;
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, any>;
  }): Promise<IAuditLog> {
    const logEntry = new AuditLogModel({
      companyId: data.companyId ? new Types.ObjectId(data.companyId) : null,
      userId: data.userId ? new Types.ObjectId(data.userId) : null,
      action: data.action,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      details: data.details,
    });
    return logEntry.save();
  }

  async getLogs(companyId?: string): Promise<IAuditLog[]> {
    const query: any = {};
    if (companyId) {
      query.companyId = new Types.ObjectId(companyId);
    }
    return AuditLogModel.find(query).populate('userId').sort({ createdAt: -1 }).limit(100).exec();
  }
}
