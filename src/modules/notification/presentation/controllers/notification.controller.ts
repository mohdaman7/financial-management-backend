import { Request, Response, NextFunction } from 'express';
import { Container } from '@shared/di/index';
import { NotificationService } from '../../application/services/notification.service';
import { ResponseFormatter } from '@shared/utils/responseFormatter';

export class NotificationController {
  private getNotificationService(): NotificationService {
    return Container.resolve<NotificationService>('NotificationService');
  }

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id as string;
      const notifications = await this.getNotificationService().getUserNotifications(userId);
      res.status(200).json(ResponseFormatter.success(notifications));
    } catch (error) {
      next(error);
    }
  };

  markRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id as string;
      const id = req.params.id as string;
      const notification = await this.getNotificationService().markAsRead(id, userId);
      res.status(200).json(ResponseFormatter.success(notification));
    } catch (error) {
      next(error);
    }
  };
}
