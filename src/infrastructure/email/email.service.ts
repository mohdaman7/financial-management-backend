import * as nodemailer from 'nodemailer';
import { config } from '@config/index';
import { logger } from '@infrastructure/logging/logger';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST || 'smtp.mailtrap.io',
      port: Number(config.SMTP_PORT) || 2525,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    });
  }

  private async sendEmail(to: string, subject: string, html: string) {
    try {
      if (!config.SMTP_USER || !config.SMTP_PASS) {
        logger.warn(`SMTP credentials not configured. Skipping email to ${to}`);
        logger.info(`Email Content: ${html}`);
        return;
      }

      await this.transporter.sendMail({
        from: config.EMAIL_FROM || '"Skyfall Financial" <noreply@skyfall.ae>',
        to,
        subject,
        html,
      });
      logger.info(`Email sent successfully to ${to}`);
    } catch (error) {
      logger.error(`Failed to send email to ${to}: ${error}`);
    }
  }

  async sendWelcomeEmail(to: string, plainPassword: string) {
    const loginUrl = 'https://crest-financial-travels.vercel.app/auth';
    const subject = 'Welcome to Skyfall Financial - Your Login Credentials';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2c3e50; text-align: center;">Welcome to Skyfall Financial!</h2>
        <p style="color: #34495e; font-size: 16px;">Hello,</p>
        <p style="color: #34495e; font-size: 16px;">Your employee account has been successfully created. You can now log in to the portal using the credentials below:</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${to}</p>
          <p style="margin: 0;"><strong>Temporary Password:</strong> <code style="background: #e9ecef; padding: 3px 6px; border-radius: 4px; font-size: 16px;">${plainPassword}</code></p>
        </div>

        <p style="color: #34495e; font-size: 16px;">Please log in using the button below. We strongly recommend changing your password after your first login.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px;">Login to Portal</a>
        </div>

        <p style="color: #7f8c8d; font-size: 14px; margin-top: 40px; text-align: center;">
          If you have any issues logging in, please contact your administrator.
        </p>
      </div>
    `;

    // Fire and forget
    this.sendEmail(to, subject, html);
  }

  async sendPasswordResetEmail(to: string, plainPassword: string) {
    const loginUrl = 'https://crest-financial-travels.vercel.app/auth';
    const subject = 'Skyfall Financial - Password Reset';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2c3e50; text-align: center;">Password Reset Notification</h2>
        <p style="color: #34495e; font-size: 16px;">Hello,</p>
        <p style="color: #34495e; font-size: 16px;">Your password for the Skyfall Financial portal has been reset by an administrator. Here are your new login details:</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${to}</p>
          <p style="margin: 0;"><strong>New Password:</strong> <code style="background: #e9ecef; padding: 3px 6px; border-radius: 4px; font-size: 16px;">${plainPassword}</code></p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px;">Login to Portal</a>
        </div>

        <p style="color: #7f8c8d; font-size: 14px; margin-top: 40px; text-align: center;">
          If you did not request this change, please contact your administrator immediately.
        </p>
      </div>
    `;

    // Fire and forget
    this.sendEmail(to, subject, html);
  }
}

export const emailService = new EmailService();
