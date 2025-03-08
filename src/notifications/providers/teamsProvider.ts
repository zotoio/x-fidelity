import { NotificationProvider, Notification } from '../../types/notificationTypes';
import { logger } from '../../utils/logger';
import { axiosClient } from '../../utils/axiosClient';

export interface TeamsProviderConfig {
  webhookUrl: string;
}

export class TeamsProvider implements NotificationProvider {
  public readonly name = 'teams';
  private config: TeamsProviderConfig;

  constructor(config: TeamsProviderConfig) {
    this.config = config;
  }

  public async send(notification: Notification): Promise<boolean> {
    try {
      // Format recipients as mentions
      const mentions = notification.recipients
        .map(recipient => `<at>${recipient}</at>`)
        .join(' ');

      // Create adaptive card for Teams
      const card = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": notification.metadata?.results?.XFI_RESULT?.fatalityCount > 0 ? "FF0000" : 
                      notification.metadata?.results?.XFI_RESULT?.warningCount > 0 ? "FFA500" : "00FF00",
        "summary": notification.subject,
        "sections": [
          {
            "activityTitle": notification.subject,
            "activitySubtitle": `X-Fidelity Analysis Report - ${new Date().toLocaleString()}`,
            "facts": [
              {
                "name": "Archetype",
                "value": notification.metadata?.results?.XFI_RESULT?.archetype || "Unknown"
              },
              {
                "name": "Files Analyzed",
                "value": notification.metadata?.results?.XFI_RESULT?.fileCount || 0
              },
              {
                "name": "Total Issues",
                "value": notification.metadata?.results?.XFI_RESULT?.totalIssues || 0
              },
              {
                "name": "Warnings",
                "value": notification.metadata?.results?.XFI_RESULT?.warningCount || 0
              },
              {
                "name": "Errors",
                "value": notification.metadata?.results?.XFI_RESULT?.errorCount || 0
              },
              {
                "name": "Fatalities",
                "value": notification.metadata?.results?.XFI_RESULT?.fatalityCount || 0
              }
            ],
            "text": notification.content
          },
          {
            "text": `**Recipients:** ${mentions}`
          }
        ],
        "potentialAction": [
          {
            "@type": "OpenUri",
            "name": "View CI Run",
            "targets": [
              {
                "os": "default",
                "uri": notification.metadata?.ciRunUrl || "https://github.com"
              }
            ]
          }
        ]
      };

      await axiosClient.post(this.config.webhookUrl, card);
      logger.info('Teams notification sent successfully');
      return true;
    } catch (error) {
      logger.error(error, 'Failed to send Teams notification');
      return false;
    }
  }
}
