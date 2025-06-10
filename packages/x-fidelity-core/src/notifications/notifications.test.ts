import { initializeNotifications } from './index';
import { NotificationManager } from './notificationManager';
import { EmailProvider } from './providers/emailProvider';
import { SlackProvider } from './providers/slackProvider';
import { TeamsProvider } from './providers/teamsProvider';
import { logger } from '../utils/logger';

// Create a mock registerProvider function
const mockRegisterProvider = jest.fn();

// Mock NotificationManager with a proper getInstance implementation
jest.mock('./notificationManager', () => ({
  NotificationManager: {
    getInstance: jest.fn().mockImplementation(() => ({
      registerProvider: mockRegisterProvider
    }))
  }
}));
jest.mock('./providers/emailProvider');
jest.mock('./providers/slackProvider');
jest.mock('./providers/teamsProvider');
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up required environment variables for providers
    process.env = {
      ...process.env,
      NOTIFICATION_EMAIL_HOST: 'smtp.test.com',
      NOTIFICATION_EMAIL_PORT: '587',
      NOTIFICATION_EMAIL_USER: 'test@test.com',
      NOTIFICATION_EMAIL_PASS: 'password123',
      NOTIFICATION_EMAIL_FROM: 'noreply@test.com',
      NOTIFICATION_SLACK_WEBHOOK: 'https://hooks.slack.com/test',
      NOTIFICATION_SLACK_CHANNEL: '#test-channel',
      NOTIFICATION_TEAMS_WEBHOOK: 'https://teams.webhook.com/test'
    };
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.NOTIFICATION_EMAIL_HOST;
    delete process.env.NOTIFICATION_EMAIL_PORT;
    delete process.env.NOTIFICATION_EMAIL_USER;
    delete process.env.NOTIFICATION_EMAIL_PASS;
    delete process.env.NOTIFICATION_EMAIL_FROM;
    delete process.env.NOTIFICATION_SLACK_WEBHOOK;
    delete process.env.NOTIFICATION_SLACK_CHANNEL;
    delete process.env.NOTIFICATION_TEAMS_WEBHOOK;
  });

  it('should initialize notifications when enabled', async () => {
    const config = {
      enabled: true,
      providers: ['email', 'slack', 'teams'],
      notifyOnSuccess: true,
      notifyOnFailure: true
    };

    await initializeNotifications(config);

    expect(NotificationManager.getInstance).toHaveBeenCalledWith(config);
    expect(EmailProvider).toHaveBeenCalled();
    expect(SlackProvider).toHaveBeenCalled();
    expect(TeamsProvider).toHaveBeenCalled();
    expect(mockRegisterProvider).toHaveBeenCalled();
  });

  it('should not initialize providers when notifications are disabled', async () => {
    const config = {
      enabled: false,
      providers: ['email', 'slack', 'teams']
    };

    await initializeNotifications(config);

    expect(NotificationManager.getInstance).toHaveBeenCalledWith(config);
    expect(EmailProvider).not.toHaveBeenCalled();
    expect(SlackProvider).not.toHaveBeenCalled();
    expect(TeamsProvider).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Notifications are disabled');
  });

  it('should handle missing provider configurations', async () => {
    process.env = {}; // Clear all env vars
    
    const config = {
      enabled: true,
      providers: ['email', 'slack', 'teams']
    };

    await initializeNotifications(config);

    expect(logger.warn).toHaveBeenCalledWith('Teams webhook URL not configured');
    expect(logger.warn).toHaveBeenCalledWith('Slack webhook URL not configured');
  });

  it('should warn about unknown providers', async () => {
    const config = {
      enabled: true,
      providers: ['unknown-provider']
    };

    await initializeNotifications(config);

    expect(logger.warn).toHaveBeenCalledWith('Unknown notification provider: unknown-provider');
  });
});
