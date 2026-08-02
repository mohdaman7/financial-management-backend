import { NotificationModel, INotification } from '../../infrastructure/models/Notification.model';
import { Types } from 'mongoose';
import { AppError } from '@shared/errors/AppError';

export class NotificationService {
  async createNotification(data: {
    companyId: string;
    userId: string;
    title: string;
    message: string;
  }): Promise<INotification> {
    const notification = new NotificationModel({
      companyId: new Types.ObjectId(data.companyId),
      userId: new Types.ObjectId(data.userId),
      title: data.title,
      message: data.message,
      isRead: false,
    });
    return notification.save();
  }

  async getUserNotifications(userId: string): Promise<INotification[]> {
    return NotificationModel.find({
      userId: new Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .exec();
  }

  async markAsRead(id: string, userId: string): Promise<INotification> {
    const notification = await NotificationModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });

    if (!notification) {
      throw AppError.notFound('Notification not found');
    }

    notification.isRead = true;
    return notification.save();
  }
}
