import { logger } from '@infrastructure/logging/logger';

export class EmailService {
  async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    // Log simulated email to Winston
    logger.info(`[EmailService] Simulating Email Sent to: ${to} | Subject: ${subject}`);
    return true;
  }
}
