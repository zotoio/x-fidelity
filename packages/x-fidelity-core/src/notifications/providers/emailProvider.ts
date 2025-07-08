import { NotificationProvider, Notification, EmailProviderConfig } from '@x-fidelity/types';
import { logger } from '../../utils/logger';
import nodemailer from 'nodemailer';
import { stringify as yamlStringify } from 'yaml';
import { convert as htmlToText } from 'html-to-text';

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

  /**
   * Safely converts HTML content to plain text
   * @param htmlContent The HTML content to convert
   * @returns Plain text version of the content
   */
  private convertHtmlToText(htmlContent: string): string {
    return htmlToText(htmlContent, {
      wordwrap: 130,
      // Security: Remove all HTML tags and decode entities safely
      preserveNewlines: true,
      // Additional security options
      limits: {
        maxInputLength: 1024 * 1024, // 1MB limit
        maxDepth: 10,
        maxChildNodes: 1000
      },
      selectors: [
        // Remove potentially dangerous elements
        { selector: 'script', format: 'skip' },
        { selector: 'style', format: 'skip' },
        { selector: 'iframe', format: 'skip' },
        { selector: 'object', format: 'skip' },
        { selector: 'embed', format: 'skip' },
        // Remove links and images
        { selector: 'a', format: 'skip' },
        { selector: 'img', format: 'skip' }
      ]
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

      // Generate plain text version with secure HTML-to-text conversion
      const plainTextContent = this.convertHtmlToText(notification.content);
      const fullTextContent = `${plainTextContent}

--- Full Results ---
${yamlStringify(notification.metadata?.results?.XFI_RESULT || 'No results available')}`;

      const info = await transporter.sendMail({
        from: this.config.from,
        to: notification.recipients.join(', '),
        subject: notification.subject,
        html: notification.content,
        text: fullTextContent,
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
