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
      const { email, password } = req.body;
      const result = await this.getAuthService().login(email, password);
      res.status(200).json(ResponseFormatter.success(result));
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const result = await this.getAuthService().refresh(refreshToken);
      res.status(200).json(ResponseFormatter.success(result));
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      await this.getAuthService().logout(refreshToken);
      res.status(200).json(ResponseFormatter.success({ message: 'Logged out successfully' }));
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
