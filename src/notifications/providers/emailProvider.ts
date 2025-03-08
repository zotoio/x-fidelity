import { NotificationProvider, Notification } from '../../types/notificationTypes';
import { logger } from '../../utils/logger';
import nodemailer from 'nodemailer';

export interface EmailProviderConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export class EmailProvider implements NotificationProvider {
  public readonly name = 'email';
  private config: EmailProviderConfig;

  constructor(config: EmailProviderConfig) {
    this.config = config;
  }

  public async send(notification: Notification): Promise<boolean> {
    try {
      const transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.auth.user,
          pass: this.config.auth.pass,
        },
      });

      const info = await transporter.sendMail({
        from: this.config.from,
        to: notification.recipients.join(', '),
        subject: notification.subject,
        text: notification.content,
        // Can add HTML version if needed
      });

      logger.info(`Email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      logger.error(error, 'Failed to send email notification');
      return false;
    }
  }
}
