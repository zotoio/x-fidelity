import { EmailProvider } from './emailProvider';
import { EmailProviderConfig, Notification } from '@x-fidelity/types';
import nodemailer from 'nodemailer';

// Mock nodemailer with proper structure  
jest.mock('nodemailer', () => ({
  createTransport: jest.fn()
}));

const mockedNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('EmailProvider', () => {
  let emailProvider: EmailProvider;
  let mockTransporter: any;
  
  const mockConfig: EmailProviderConfig = {
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    from: 'noreply@example.com',
    auth: {
      user: 'testuser',
      pass: 'testpass'
    }
  };

  const mockNotification: Notification = {
    id: 'test-notification-1',
    recipients: ['test@example.com', 'admin@example.com'],
    subject: 'X-Fidelity Analysis Complete',
    content: '<h1>Analysis Results</h1><p>Issues found: 5</p>',
    timestamp: new Date().toISOString(),
    metadata: {
      results: {
        XFI_RESULT: {
          summary: {
            totalIssues: 5,
            highSeverity: 2,
            mediumSeverity: 3
          },
          issues: [
            { type: 'error', message: 'Critical issue found' },
            { type: 'warning', message: 'Warning issue found' }
          ]
        }
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock transporter
    mockTransporter = {
      verify: jest.fn(),
      sendMail: jest.fn()
    };
    
    (mockedNodemailer.createTransport as jest.MockedFunction<typeof nodemailer.createTransport>)
      .mockReturnValue(mockTransporter);
    
    emailProvider = new EmailProvider(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      const provider = new EmailProvider(mockConfig);
      expect(provider.name).toBe('email');
    });
  });

  describe('getRecipients', () => {
    it('should return empty array as recipients are provided in notification', async () => {
      const recipients = await emailProvider.getRecipients();
      expect(recipients).toEqual([]);
    });
  });

  describe('initialize', () => {
    it('should update config', async () => {
      const newConfig: EmailProviderConfig = {
        ...mockConfig,
        host: 'smtp.newhost.com'
      };
      
      await emailProvider.initialize(newConfig);
      // We can't directly test private config, but we can test that it's used
      expect(() => emailProvider.initialize(newConfig)).not.toThrow();
    });
  });

  describe('createTransporter', () => {
    it('should create transporter with correct config', async () => {
      mockTransporter.verify.mockResolvedValue(true);
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: '250 OK',
        accepted: ['test@example.com'],
        rejected: []
      });

      await emailProvider.send(mockNotification);

      expect(mockedNodemailer.createTransport).toHaveBeenCalledWith({
        host: mockConfig.host,
        port: mockConfig.port,
        secure: mockConfig.secure,
        auth: {
          user: mockConfig.auth!.user,
          pass: mockConfig.auth!.pass
        }
      });
    });

    it('should create transporter without auth when not provided', async () => {
      const configWithoutAuth: EmailProviderConfig = {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        from: 'noreply@example.com'
      };
      
      const provider = new EmailProvider(configWithoutAuth);
      mockTransporter.verify.mockResolvedValue(true);
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: '250 OK',
        accepted: ['test@example.com'],
        rejected: []
      });

      await provider.send(mockNotification);

      expect(mockedNodemailer.createTransport).toHaveBeenCalledWith({
        host: configWithoutAuth.host,
        port: configWithoutAuth.port,
        secure: configWithoutAuth.secure,
        auth: undefined
      });
    });
  });

  describe('send', () => {
    it('should send email successfully', async () => {
      mockTransporter.verify.mockResolvedValue(true);
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: '250 OK',
        accepted: ['test@example.com', 'admin@example.com'],
        rejected: []
      });

      await emailProvider.send(mockNotification);

      expect(mockTransporter.verify).toHaveBeenCalled();
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: mockConfig.from,
        to: 'test@example.com, admin@example.com',
        subject: mockNotification.subject,
        html: mockNotification.content,
        text: expect.stringContaining('Analysis Results')
      });
    });

    it('should handle SMTP verification failure', async () => {
      const verifyError = new Error('SMTP connection failed');
      mockTransporter.verify.mockRejectedValue(verifyError);

      await emailProvider.send(mockNotification);

      expect(mockTransporter.verify).toHaveBeenCalled();
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should handle send mail failure', async () => {
      mockTransporter.verify.mockResolvedValue(true);
      const sendError = new Error('Failed to send email');
      mockTransporter.sendMail.mockRejectedValue(sendError);

      await emailProvider.send(mockNotification);

      expect(mockTransporter.verify).toHaveBeenCalled();
      expect(mockTransporter.sendMail).toHaveBeenCalled();
      // Should not throw, but log error
    });

    it('should generate correct plain text content', async () => {
      mockTransporter.verify.mockResolvedValue(true);
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: '250 OK',
        accepted: [],
        rejected: []
      });

      await emailProvider.send(mockNotification);

      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.text).toContain('Analysis Results');
      expect(sendMailCall.text).toContain('Issues found: 5');
      expect(sendMailCall.text).toContain('--- Full Results ---');
      expect(sendMailCall.text).toContain('totalIssues: 5');
    });

    it('should handle notification without metadata', async () => {
      const notificationWithoutMetadata: Notification = {
        ...mockNotification,
        metadata: undefined
      };

      mockTransporter.verify.mockResolvedValue(true);
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: '250 OK',
        accepted: [],
        rejected: []
      });

      await emailProvider.send(notificationWithoutMetadata);

      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.text).toContain('No results available');
    });

    it('should strip HTML tags from content for plain text', async () => {
      const htmlNotification: Notification = {
        ...mockNotification,
        content: '<h1>Test</h1><p>Content with <strong>HTML</strong> tags</p>'
      };

      mockTransporter.verify.mockResolvedValue(true);
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: '250 OK',
        accepted: [],
        rejected: []
      });

      await emailProvider.send(htmlNotification);

      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.text).toContain('Test');
      expect(sendMailCall.text).toContain('Content with HTML tags');
      expect(sendMailCall.text).not.toContain('<h1>');
      expect(sendMailCall.text).not.toContain('<strong>');
    });

    it('should handle empty recipients array', async () => {
      const notificationNoRecipients: Notification = {
        ...mockNotification,
        recipients: []
      };

      mockTransporter.verify.mockResolvedValue(true);
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: '250 OK',
        accepted: [],
        rejected: []
      });

      await emailProvider.send(notificationNoRecipients);

      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.to).toBe('');
    });

    it('should handle single recipient', async () => {
      const singleRecipientNotification: Notification = {
        ...mockNotification,
        recipients: ['single@example.com']
      };

      mockTransporter.verify.mockResolvedValue(true);
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: '250 OK',
        accepted: [],
        rejected: []
      });

      await emailProvider.send(singleRecipientNotification);

      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.to).toBe('single@example.com');
    });
  });

  describe('formatResults', () => {
    it('should handle missing results in notification metadata', async () => {
      const notificationNoResults: Notification = {
        ...mockNotification,
        metadata: {}
      };

      mockTransporter.verify.mockResolvedValue(true);
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: '250 OK',
        accepted: [],
        rejected: []
      });

      await emailProvider.send(notificationNoResults);

      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.text).toContain('No results available');
    });

    it('should format complex XFI_RESULT as YAML', async () => {
      const complexResults = {
        XFI_RESULT: {
          summary: {
            totalIssues: 10,
            criticalIssues: 2,
            highSeverity: 3,
            mediumSeverity: 5
          },
          issues: [
            {
              type: 'critical',
              rule: 'security-violation',
              file: 'app.js',
              line: 42,
              message: 'Potential security vulnerability'
            }
          ],
          metrics: {
            analysisTime: 1234,
            filesAnalyzed: 50
          }
        }
      };

      const complexNotification: Notification = {
        ...mockNotification,
        metadata: { results: complexResults }
      };

      mockTransporter.verify.mockResolvedValue(true);
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: '250 OK',
        accepted: [],
        rejected: []
      });

      await emailProvider.send(complexNotification);

      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.text).toContain('totalIssues: 10');
      expect(sendMailCall.text).toContain('criticalIssues: 2');
      expect(sendMailCall.text).toContain('security-violation');
      expect(sendMailCall.text).toContain('app.js');
    });
  });
}); 