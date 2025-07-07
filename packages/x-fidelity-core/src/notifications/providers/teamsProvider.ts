import { NotificationProvider, Notification, TeamsProviderConfig } from '@x-fidelity/types';
import { logger } from '../../utils/logger';
import { axiosClient } from '../../utils/axiosClient';

export class TeamsProvider implements NotificationProvider {
  public readonly name = 'teams';
  private config: TeamsProviderConfig;

  constructor(config: TeamsProviderConfig) {
    this.config = config;
  }

  async getRecipients(): Promise<string[]> {
    // Return empty array as recipients are provided in notification
    return [];
  }

  async initialize(config: TeamsProviderConfig): Promise<void> {
    this.config = config;
  }

  public async send(notification: Notification): Promise<void> {
    // Validate webhook URL
    if (!this.config.webhookUrl || this.config.webhookUrl.trim() === '') {
      throw new Error('Teams webhook URL is required');
    }

    // Basic URL validation
    try {
      new URL(this.config.webhookUrl);
    } catch {
      throw new Error('Invalid Teams webhook URL format');
    }

    try {
      const fatalityCount = notification.metadata?.results?.XFI_RESULT?.fatalityCount || 0;
      const warningCount = notification.metadata?.results?.XFI_RESULT?.warningCount || 0;
      
      const payload = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": fatalityCount > 0 ? "FF0000" :
                      warningCount > 0 ? "FFA500" : "00FF00",
        "summary": notification.title,
        "sections": [
          {
            "activityTitle": notification.title,
            "activitySubtitle": notification.message,
            "facts": [
              {
                "name": "Type",
                "value": notification.type
              },
              {
                "name": "Recipients",
                "value": notification.recipients.join(', ')
              }
            ],
            "markdown": true
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
        throw new Error(`Teams API error: ${response.status} ${response.statusText}`);
      }

      logger.info('Teams notification sent successfully');
    } catch (error) {
      logger.error('Failed to send Teams notification:', error);
      throw error;
    }
  }
}
