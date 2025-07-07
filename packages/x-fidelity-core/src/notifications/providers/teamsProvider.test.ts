import { TeamsProvider } from './teamsProvider';
import { TeamsProviderConfig, Notification } from '@x-fidelity/types';

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

describe('TeamsProvider', () => {
  let teamsProvider: TeamsProvider;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  const mockConfig: TeamsProviderConfig = {
    webhookUrl: 'https://outlook.office.com/webhook/test-webhook-url'
  };

  const mockNotification: Notification = {
    id: 'test-notification-1',
    type: 'success',
    title: 'X-Fidelity Analysis Success',
    message: 'Found 2 issues (0 warnings, 2 errors, 0 fatal)',
    recipients: ['team@example.com'],
    subject: 'X-Fidelity Analysis Complete',
    content: '<h1>Analysis Results</h1><p>Issues found: 4</p>',
    timestamp: new Date().toISOString(),
    metadata: {
      results: {
        XFI_RESULT: {
          archetype: 'node-fullstack',
          totalIssues: 2,
          warningCount: 0,
          errorCount: 2,
          fatalityCount: 0
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

    teamsProvider = new TeamsProvider(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      const provider = new TeamsProvider(mockConfig);
      expect(provider.name).toBe('teams');
    });

    it('should store the provided configuration', () => {
      const provider = new TeamsProvider(mockConfig);
      expect(provider).toBeDefined();
    });
  });

  describe('getRecipients', () => {
    it('should return empty array as recipients are provided in notification', async () => {
      const recipients = await teamsProvider.getRecipients();
      expect(recipients).toEqual([]);
    });
  });

  describe('initialize', () => {
    it('should update config', async () => {
      const newConfig: TeamsProviderConfig = {
        webhookUrl: 'https://new.webhook.url'
      };

      await teamsProvider.initialize(newConfig);
      expect(() => teamsProvider.initialize(newConfig)).not.toThrow();
    });
  });

  describe('send', () => {
    it('should send success notification with correct payload', async () => {
      await teamsProvider.send(mockNotification);

      expect(mockFetch).toHaveBeenCalledWith(
        mockConfig.webhookUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": "00FF00", // Green for success with no fatalities
            "summary": mockNotification.title,
            "sections": [
              {
                "activityTitle": mockNotification.title,
                "activitySubtitle": mockNotification.message,
                "facts": [
                  {
                    "name": "Type",
                    "value": mockNotification.type
                  },
                  {
                    "name": "Recipients",
                    "value": mockNotification.recipients.join(', ')
                  }
                ],
                "markdown": true
              }
            ]
          })
        }
      );
    });

    it('should use red color for notifications with fatalities', async () => {
      const notificationWithFatalities: Notification = {
        ...mockNotification,
        metadata: {
          results: {
            XFI_RESULT: {
              ...mockNotification.metadata!.results!.XFI_RESULT,
              fatalityCount: 3
            }
          }
        }
      };

      await teamsProvider.send(notificationWithFatalities);

      const payload = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(payload.themeColor).toBe('FF0000'); // Red
    });

    it('should use orange color for notifications with warnings but no fatalities', async () => {
      const notificationWithWarnings: Notification = {
        ...mockNotification,
        metadata: {
          results: {
            XFI_RESULT: {
              ...mockNotification.metadata!.results!.XFI_RESULT,
              fatalityCount: 0,
              warningCount: 5
            }
          }
        }
      };

      await teamsProvider.send(notificationWithWarnings);

      const payload = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(payload.themeColor).toBe('FFA500'); // Orange
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);

      await expect(teamsProvider.send(mockNotification)).rejects.toThrow(
        'Teams API error: 404 Not Found'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(teamsProvider.send(mockNotification)).rejects.toThrow('Network error');
    });

    it('should handle notification without metadata', async () => {
      const notificationWithoutMetadata: Notification = {
        ...mockNotification,
        metadata: undefined
      };

      await teamsProvider.send(notificationWithoutMetadata);

      const payload = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(payload.themeColor).toBe('00FF00'); // Should default to green
    });

    it('should handle empty recipients array', async () => {
      const notificationWithEmptyRecipients: Notification = {
        ...mockNotification,
        recipients: []
      };

      await teamsProvider.send(notificationWithEmptyRecipients);

      const payload = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(payload.sections[0].facts[1].value).toBe('');
    });

    it('should handle multiple recipients', async () => {
      const notificationWithMultipleRecipients: Notification = {
        ...mockNotification,
        recipients: ['user1@example.com', 'user2@example.com', 'team@example.com']
      };

      await teamsProvider.send(notificationWithMultipleRecipients);

      const payload = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(payload.sections[0].facts[1].value).toBe('user1@example.com, user2@example.com, team@example.com');
    });

    it('should handle 500 server error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      await expect(teamsProvider.send(mockNotification)).rejects.toThrow(
        'Teams API error: 500 Internal Server Error'
      );
    });

    it('should handle malformed webhook URL', async () => {
      const configWithMalformedUrl: TeamsProviderConfig = {
        webhookUrl: 'not-a-valid-url'
      };

      const provider = new TeamsProvider(configWithMalformedUrl);

      await expect(provider.send(mockNotification)).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle undefined notification type', async () => {
      const notificationWithUndefinedType: Notification = {
        ...mockNotification,
        type: undefined as any
      };

      await expect(teamsProvider.send(notificationWithUndefinedType)).resolves.not.toThrow();
    });

    it('should handle null metadata gracefully', async () => {
      const notificationWithNullMetadata: Notification = {
        ...mockNotification,
        metadata: null as any
      };

      await teamsProvider.send(notificationWithNullMetadata);

      const payload = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(payload.themeColor).toBe('00FF00'); // Should default to green
    });

    it('should handle missing XFI_RESULT in metadata', async () => {
      const notificationWithoutXFIResult: Notification = {
        ...mockNotification,
        metadata: {
          results: {} as any
        }
      };

      await teamsProvider.send(notificationWithoutXFIResult);

      const payload = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(payload.themeColor).toBe('00FF00'); // Should default to green
    });

    it('should handle very long titles and messages', async () => {
      const longContent = 'x'.repeat(1000);
      const notificationWithLongContent: Notification = {
        ...mockNotification,
        title: longContent,
        message: longContent
      };

      await expect(teamsProvider.send(notificationWithLongContent)).resolves.not.toThrow();
    });

    it('should handle special characters in content', async () => {
      const specialContent = '特殊字符 & <script>alert("test")</script> 🚀';
      const notificationWithSpecialContent: Notification = {
        ...mockNotification,
        title: specialContent,
        message: specialContent
      };

      await teamsProvider.send(notificationWithSpecialContent);

      const payload = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(payload.summary).toBe(specialContent);
      expect(payload.sections[0].activityTitle).toBe(specialContent);
    });

    it('should handle fetch timeout', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      await expect(teamsProvider.send(mockNotification)).rejects.toThrow('Timeout');
    });
  });

  describe('color coding logic', () => {
    it('should prioritize fatality color over warning color', async () => {
      const notificationWithBoth: Notification = {
        ...mockNotification,
        metadata: {
          results: {
            XFI_RESULT: {
              ...mockNotification.metadata!.results!.XFI_RESULT,
              fatalityCount: 2,
              warningCount: 10
            }
          }
        }
      };

      await teamsProvider.send(notificationWithBoth);

      const payload = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(payload.themeColor).toBe('FF0000'); // Red takes priority
    });

    it('should use green when no fatalities or warnings', async () => {
      const cleanNotification: Notification = {
        ...mockNotification,
        metadata: {
          results: {
            XFI_RESULT: {
              ...mockNotification.metadata!.results!.XFI_RESULT,
              fatalityCount: 0,
              warningCount: 0,
              errorCount: 0
            }
          }
        }
      };

      await teamsProvider.send(cleanNotification);

      const payload = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(payload.themeColor).toBe('00FF00'); // Green
    });
  });
}); 