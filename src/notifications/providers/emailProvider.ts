import { NotificationProvider, Notification } from '../../types/notificationTypes';
import { logger } from '../../utils/logger';
import nodemailer from 'nodemailer';
import { stringify as yamlStringify } from 'yaml';

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
      logger.debug({
        config: {
          ...this.config,
          auth: {
            user: this.config.auth.user,
            pass: '****'
          }
        },
        notification: {
          recipients: notification.recipients,
          subject: notification.subject,
          contentLength: notification.content.length
        }
      }, 'Attempting to send email notification');

      const transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.auth.user,
          pass: this.config.auth.pass,
        },
      });

      // Test the connection
      try {
        await transporter.verify();
        logger.debug('SMTP connection verified successfully');
      } catch (verifyError) {
        logger.error(verifyError, 'Failed to verify SMTP connection');
        return false;
      }

      // Generate plain text version with YAML
      const plainTextContent = `${notification.content.replace(/<[^>]*>/g, '')}

--- Full Results ---
${yamlStringify(notification.metadata?.results.XFI_RESULT)}`;

      const info = await transporter.sendMail({
        from: this.config.from,
        to: notification.recipients.join(', '),
        subject: notification.subject,
        html: notification.content,
        text: plainTextContent,
      });

      logger.info({
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected
      }, 'Email sent successfully');
      
      return true;
    } catch (error) {
      logger.error({
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        notification: {
          recipients: notification.recipients,
          subject: notification.subject
        }
      }, 'Failed to send email notification');
      return false;
    }
  }
}
