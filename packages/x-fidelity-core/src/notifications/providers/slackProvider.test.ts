import { SlackProvider } from './slackProvider';
import { SlackProviderConfig, Notification } from '@x-fidelity/types';

// Mock global fetch
global.fetch = jest.fn();

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock axios client
jest.mock('../../utils/axiosClient', () => ({
  axiosClient: {
    post: jest.fn()
  }
}));

describe('SlackProvider', () => {
  let slackProvider: SlackProvider;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  const mockConfig: SlackProviderConfig = {
    webhookUrl: 'https://hooks.slack.com/services/test/webhook/url',
    channel: '#test-channel',
    username: 'X-Fidelity Bot'
  };

  const mockNotification: Notification = {
    id: 'test-notification-1',
    type: 'success',
    title: 'X-Fidelity Analysis Success',
    message: 'Found 5 issues (2 warnings, 2 errors, 1 fatal)',
    recipients: ['@channel'],
    subject: 'X-Fidelity Analysis Complete',
    content: '<h1>Analysis Results</h1><p>Issues found: 5</p>',
    timestamp: new Date().toISOString(),
    metadata: {
      results: {
        XFI_RESULT: {
          archetype: 'node-fullstack',
          totalIssues: 5,
          warningCount: 2,
          errorCount: 2,
          fatalityCount: 1
        }
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK'
    } as Response);

    slackProvider = new SlackProvider(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      const provider = new SlackProvider(mockConfig);
      expect(provider.name).toBe('slack');
    });

    it('should store the provided configuration', () => {
      const provider = new SlackProvider(mockConfig);
      expect(provider).toBeDefined();
    });
  });

  describe('getRecipients', () => {
    it('should return empty array as recipients are provided in notification', async () => {
      const recipients = await slackProvider.getRecipients();
      expect(recipients).toEqual([]);
    });
  });

  describe('initialize', () => {
    it('should update config', async () => {
      const newConfig: SlackProviderConfig = {
        ...mockConfig,
        channel: '#new-channel'
      };

      await slackProvider.initialize(newConfig);
      expect(() => slackProvider.initialize(newConfig)).not.toThrow();
    });
  });

  describe('send', () => {
    it('should send success notification with correct payload', async () => {
      await slackProvider.send(mockNotification);

      expect(mockFetch).toHaveBeenCalledWith(
        mockConfig.webhookUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: mockConfig.channel,
            username: mockConfig.username,
            text: mockNotification.content,
            attachments: [
              {
                color: 'good',
                title: mockNotification.title,
                text: mockNotification.message,
                fields: [
                  {
                    title: 'Type',
                    value: mockNotification.type,
                    short: true
                  }
                ]
              }
            ]
          })
        }
      );
    });

    it('should send failure notification with danger color', async () => {
      const failureNotification: Notification = {
        ...mockNotification,
        type: 'failure',
        title: 'X-Fidelity Analysis Failure'
      };

      await slackProvider.send(failureNotification);

      const payload = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(payload.attachments[0].color).toBe('danger');
    });

    it('should use default username when not provided', async () => {
      const configWithoutUsername: SlackProviderConfig = {
        webhookUrl: mockConfig.webhookUrl,
        channel: mockConfig.channel
      };

      const provider = new SlackProvider(configWithoutUsername);
      await provider.send(mockNotification);

      const payload = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(payload.username).toBe('X-Fidelity');
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);

      await expect(slackProvider.send(mockNotification)).rejects.toThrow(
        'Slack API error: 404 Not Found'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(slackProvider.send(mockNotification)).rejects.toThrow('Network error');
    });

    it('should handle empty notification content', async () => {
      const notificationWithEmptyContent: Notification = {
        ...mockNotification,
        content: ''
      };

      await slackProvider.send(notificationWithEmptyContent);

      const payload = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(payload.text).toBe('');
    });

    it('should handle very long notification content', async () => {
      const longContent = 'x'.repeat(10000);
      const notificationWithLongContent: Notification = {
        ...mockNotification,
        content: longContent
      };

      await slackProvider.send(notificationWithLongContent);

      const payload = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(payload.text).toBe(longContent);
    });

    it('should handle special characters in content', async () => {
      const specialContent = '特殊字符 & <script>alert("test")</script> 🚀';
      const notificationWithSpecialContent: Notification = {
        ...mockNotification,
        content: specialContent
      };

      await slackProvider.send(notificationWithSpecialContent);

      const payload = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(payload.text).toBe(specialContent);
    });

    it('should handle notification without metadata', async () => {
      const notificationWithoutMetadata: Notification = {
        ...mockNotification,
        metadata: undefined
      };

      await expect(slackProvider.send(notificationWithoutMetadata)).resolves.not.toThrow();
    });

    it('should handle 500 server error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      await expect(slackProvider.send(mockNotification)).rejects.toThrow(
        'Slack API error: 500 Internal Server Error'
      );
    });

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      } as Response);

      await expect(slackProvider.send(mockNotification)).rejects.toThrow(
        'Slack API error: 429 Too Many Requests'
      );
    });

    it('should handle missing webhook URL gracefully', async () => {
      const configWithoutWebhook: SlackProviderConfig = {
        channel: '#test',
        webhookUrl: ''
      };

      const provider = new SlackProvider(configWithoutWebhook);

      await expect(provider.send(mockNotification)).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle undefined notification type', async () => {
      const notificationWithUndefinedType: Notification = {
        ...mockNotification,
        type: undefined as any
      };

      await slackProvider.send(notificationWithUndefinedType);

      const payload = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(payload.attachments[0].color).toBe('danger'); // Should default to danger for non-success
    });

    it('should handle notification with null values', async () => {
      const notificationWithNulls: Notification = {
        ...mockNotification,
        title: null as any,
        message: null as any
      };

      await expect(slackProvider.send(notificationWithNulls)).resolves.not.toThrow();
    });

    it('should handle malformed webhook URL', async () => {
      const configWithMalformedUrl: SlackProviderConfig = {
        ...mockConfig,
        webhookUrl: 'not-a-valid-url'
      };

      const provider = new SlackProvider(configWithMalformedUrl);

      await expect(provider.send(mockNotification)).rejects.toThrow();
    });

    it('should handle response with no body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK'
      } as Response);

      await expect(slackProvider.send(mockNotification)).resolves.not.toThrow();
    });

    it('should handle fetch timeout', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      await expect(slackProvider.send(mockNotification)).rejects.toThrow('Timeout');
    });
  });

  describe('configuration variations', () => {
    it('should work with minimal configuration', async () => {
      const minimalConfig: SlackProviderConfig = {
        webhookUrl: 'https://hooks.slack.com/test',
        channel: '#general'
      };

      const provider = new SlackProvider(minimalConfig);
      await provider.send(mockNotification);

      const payload = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(payload.username).toBe('X-Fidelity'); // Should use default
    });

    it('should handle configuration with extra properties', async () => {
      const extendedConfig = {
        ...mockConfig,
        extraProperty: 'should be ignored'
      } as SlackProviderConfig & { extraProperty: string };

      const provider = new SlackProvider(extendedConfig);
      await expect(provider.send(mockNotification)).resolves.not.toThrow();
    });

    it('should handle channel names with and without # prefix', async () => {
      const configWithoutHash: SlackProviderConfig = {
        ...mockConfig,
        channel: 'test-channel' // Without #
      };

      const provider = new SlackProvider(configWithoutHash);
      await provider.send(mockNotification);

      const payload = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(payload.channel).toBe('test-channel');
    });
  });
}); 