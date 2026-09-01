import { Request, Response, NextFunction } from 'express';
import { Container } from '@shared/di/index';
import { AuthService } from '../../application/services/auth.service';
import { ResponseFormatter } from '@shared/utils/responseFormatter';

export class AuthController {
  private getAuthService(): AuthService {
    return Container.resolve<AuthService>('AuthService');
  }

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, role } = req.body;
      const result = await this.getAuthService().login(email, password, role);
      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const profile = await this.getAuthService().getMe(userId);
      res.status(200).json(ResponseFormatter.success(profile));
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.body.refresh_token || req.body.refreshToken;
      const result = await this.getAuthService().refresh(token);
      res.status(200).json(ResponseFormatter.success(result));
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.body?.refresh_token || req.body?.refreshToken;
      const userId = req.user?.id;
      await this.getAuthService().logout(token, userId);
      res.status(200).json({
        success: true,
        message: 'User logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  switchCompany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { companyId } = req.body;
      const result = await this.getAuthService().switchCompany(userId, companyId);
      res.status(200).json(ResponseFormatter.success(result));
    } catch (error) {
      next(error);
    }
  };
}
