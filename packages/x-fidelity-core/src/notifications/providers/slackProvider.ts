import { NotificationProvider, Notification, SlackProviderConfig } from '@x-fidelity/types';
import { logger } from '../../utils/logger';
import { axiosClient } from '../../utils/axiosClient';

export class SlackProvider implements NotificationProvider {
  public readonly name = 'slack';
  private config: SlackProviderConfig;

  constructor(config: SlackProviderConfig) {
    this.config = config;
  }

  async getRecipients(): Promise<string[]> {
    // Return empty array as recipients are provided in notification
    return [];
  }

  async initialize(config: SlackProviderConfig): Promise<void> {
    this.config = config;
  }

  public async send(notification: Notification): Promise<void> {
    // Validate webhook URL
    if (!this.config.webhookUrl || this.config.webhookUrl.trim() === '') {
      throw new Error('Slack webhook URL is required');
    }

    // Basic URL validation
    try {
      new URL(this.config.webhookUrl);
    } catch {
      throw new Error('Invalid Slack webhook URL format');
    }

    try {
      const payload = {
        channel: this.config.channel,
        username: this.config.username || 'X-Fidelity',
        text: notification.content,
        attachments: [
          {
            color: notification.type === 'success' ? 'good' : 'danger',
            title: notification.title,
            text: notification.message,
            fields: [
              {
                title: 'Type',
                value: notification.type,
                short: true
              }
            ]
          }
        ]
      };

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
      }

      logger.info('Slack notification sent successfully');
    } catch (error) {
      logger.error('Failed to send Slack notification:', error);
      throw error;
    }
  }
}
