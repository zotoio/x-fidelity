import { NotificationManager } from './notificationManager';
import { EmailProvider, EmailProviderConfig } from './providers/emailProvider';
import { SlackProvider, SlackProviderConfig } from './providers/slackProvider';
import { TeamsProvider, TeamsProviderConfig } from './providers/teamsProvider';
import { NotificationConfig } from '../types/notificationTypes';
import { logger } from '../utils/logger';

export async function initializeNotifications(config: NotificationConfig): Promise<NotificationManager> {
  if (!config.enabled) {
    logger.info('Notifications are disabled');
    return NotificationManager.getInstance(config);
  }

  const notificationManager = NotificationManager.getInstance(config);

  // Register configured providers
  for (const providerName of config.providers) {
    switch (providerName) {
      case 'email':
        const emailConfig = loadEmailConfig();
        if (emailConfig) {
          notificationManager.registerProvider(new EmailProvider(emailConfig));
        }
        break;
      case 'slack':
        const slackConfig = loadSlackConfig();
        if (slackConfig) {
          notificationManager.registerProvider(new SlackProvider(slackConfig));
        }
        break;
      case 'teams':
        const teamsConfig = loadTeamsConfig();
        if (teamsConfig) {
          notificationManager.registerProvider(new TeamsProvider(teamsConfig));
        }
        break;
      default:
        logger.warn(`Unknown notification provider: ${providerName}`);
    }
  }

  return notificationManager;
}

function loadEmailConfig(): EmailProviderConfig | null {
  try {
    return {
      host: process.env.NOTIFICATION_EMAIL_HOST || '',
      port: parseInt(process.env.NOTIFICATION_EMAIL_PORT || '587'),
      secure: process.env.NOTIFICATION_EMAIL_SECURE === 'true',
      auth: {
        user: process.env.NOTIFICATION_EMAIL_USER || '',
        pass: process.env.NOTIFICATION_EMAIL_PASS || '',
      },
      from: process.env.NOTIFICATION_EMAIL_FROM || 'x-fidelity@noreply.com',
    };
  } catch (error) {
    logger.error(error, 'Failed to load email configuration');
    return null;
  }
}

function loadSlackConfig(): SlackProviderConfig | null {
  try {
    const webhookUrl = process.env.NOTIFICATION_SLACK_WEBHOOK;
    if (!webhookUrl) {
      logger.warn('Slack webhook URL not configured');
      return null;
    }
    
    return {
      webhookUrl,
      channel: process.env.NOTIFICATION_SLACK_CHANNEL,
    };
  } catch (error) {
    logger.error(error, 'Failed to load Slack configuration');
    return null;
  }
}

function loadTeamsConfig(): TeamsProviderConfig | null {
  try {
    const webhookUrl = process.env.NOTIFICATION_TEAMS_WEBHOOK;
    if (!webhookUrl) {
      logger.warn('Teams webhook URL not configured');
      return null;
    }
    
    return {
      webhookUrl
    };
  } catch (error) {
    logger.error(error, 'Failed to load Teams configuration');
    return null;
  }
}
