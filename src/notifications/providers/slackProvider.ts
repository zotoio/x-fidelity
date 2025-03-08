import { NotificationProvider, Notification } from '../../types/notificationTypes';
import { logger } from '../../utils/logger';
import { axiosClient } from '../../utils/axiosClient';

export interface SlackProviderConfig {
  webhookUrl: string;
  channel?: string;
}

export class SlackProvider implements NotificationProvider {
  public readonly name = 'slack';
  private config: SlackProviderConfig;

  constructor(config: SlackProviderConfig) {
    this.config = config;
  }

  public async send(notification: Notification): Promise<boolean> {
    try {
      // Convert recipients to Slack mentions
      const mentions = notification.recipients
        .map(recipient => `@${recipient}`)
        .join(' ');

      const message = {
        text: `${notification.subject}\n\n${mentions}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: notification.subject
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: notification.content
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `*Recipients:* ${mentions}`
              }
            ]
          }
        ],
        channel: this.config.channel
      };

      await axiosClient.post(this.config.webhookUrl, message);
      logger.info('Slack notification sent successfully');
      return true;
    } catch (error) {
      logger.error(error, 'Failed to send Slack notification');
      return false;
    }
  }
}
