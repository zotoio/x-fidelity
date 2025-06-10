import { NotificationProvider, Notification, EmailProviderConfig } from '@x-fidelity/types';
import { logger } from '../../utils/logger';
import nodemailer from 'nodemailer';
import { stringify as yamlStringify } from 'yaml';

export class EmailProvider implements NotificationProvider {
  public readonly name = 'email';
  private config: EmailProviderConfig;

  constructor(config: EmailProviderConfig) {
    this.config = config;
  }

  async getRecipients(): Promise<string[]> {
    // Return empty array as recipients are provided in notification
    return [];
  }

  async initialize(config: EmailProviderConfig): Promise<void> {
    this.config = config;
  }

      private createTransporter() {
        return nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure || false,
                      auth: this.config.auth ? {
                    user: this.config.auth.user || '',
                    pass: this.config.auth.pass || '',
                } : undefined,
    });
  }

  public async send(notification: Notification): Promise<void> {
    try {
      logger.debug({
        config: {
          ...this.config,
          auth: {
            user: this.config.auth?.user || 'not configured',
            pass: '****'
          }
        },
        notification: {
          recipients: notification.recipients,
          subject: notification.subject,
          contentLength: notification.content.length
        }
      }, 'Attempting to send email notification');

      const transporter = this.createTransporter();

      // Test the connection
      try {
        await transporter.verify();
        logger.debug('SMTP connection verified successfully');
      } catch (verifyError) {
        logger.error(verifyError, 'Failed to verify SMTP connection');
        return;
      }

      // Generate plain text version with YAML
      const plainTextContent = `${notification.content.replace(/<[^>]*>/g, '')}

--- Full Results ---
${yamlStringify(notification.metadata?.results?.XFI_RESULT || 'No results available')}`;

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
    }
  }

  private formatResults(notification: Notification): string {
    if (!notification.metadata?.results) {
      return 'No results available';
    }

    return `
## X-Fidelity Analysis Results

${yamlStringify(notification.metadata.results.XFI_RESULT)}`;
  }
}
