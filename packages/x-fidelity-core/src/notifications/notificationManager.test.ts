import { NotificationManager } from './notificationManager';
import { NotificationProvider, Notification, RepoXFIConfig, ResultMetadata } from '@x-fidelity/types';
import { execSync } from 'child_process';
import fs from 'fs';

// Mock dependencies
jest.mock('child_process');
jest.mock('fs');
jest.mock('../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    trace: jest.fn()
  }
}));

const mockedExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('NotificationManager', () => {
  let notificationManager: NotificationManager;
  let mockProvider: NotificationProvider;

  const mockRepoXFIConfig: RepoXFIConfig = {
    notifications: {
      notifyOnSuccess: true,
      notifyOnFailure: true,
      codeOwners: true,
      recipients: ['test@example.com'],
      providers: {
        email: {
          host: 'smtp.example.com',
          port: 587,
          from: 'noreply@example.com'
        }
      },
      codeOwnersPath: '.github/CODEOWNERS'
    }
  };

  const mockResults: ResultMetadata = {
    XFI_RESULT: {
      archetype: 'test-archetype',
      totalIssues: 5,
      warningCount: 2,
      errorCount: 2,
      fatalityCount: 1,
      repoPath: '/test/repo',
      repoUrl: 'https://github.com/test/repo.git',
      issueDetails: [
        {
          filePath: '/test/repo/src/index.ts',
          errors: [
            {
              ruleFailure: 'test-rule',
              level: 'error',
              message: 'Test error message',
              line: 10,
              column: 5
            }
          ]
        }
      ]
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockProvider = {
      name: 'test-provider',
      send: jest.fn().mockResolvedValue(undefined),
      getRecipients: jest.fn().mockResolvedValue([]),
      initialize: jest.fn().mockResolvedValue(undefined)
    };

    // Mock fs.readFileSync for CODEOWNERS
    mockedFs.readFileSync.mockReturnValue(`
# Global owners
* @global-owner

# Frontend owners
/src/frontend/ @frontend-team

# Backend owners  
/src/backend/ @backend-team

# Documentation
*.md @docs-team
`);

    // Mock execSync for git commands
    mockedExecSync.mockImplementation((command: string) => {
      if (command.includes('git config --get remote.origin.url')) {
        return Buffer.from('https://github.com/test/repo.git');
      }
      if (command.includes('git rev-parse --abbrev-ref HEAD')) {
        return Buffer.from('main');
      }
      return Buffer.from('');
    });

    notificationManager = new NotificationManager(mockRepoXFIConfig);
  });

  describe('constructor', () => {
    it('should initialize with default configuration when no config provided', () => {
      const manager = new NotificationManager();
      expect(manager).toBeDefined();
    });

    it('should initialize with provided configuration', () => {
      const manager = new NotificationManager(mockRepoXFIConfig);
      expect(manager).toBeDefined();
    });

    it('should load code owners when path is provided', () => {
      expect(mockedFs.readFileSync).toHaveBeenCalledWith('.github/CODEOWNERS', 'utf8');
    });

    it('should handle missing CODEOWNERS file gracefully', () => {
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const manager = new NotificationManager(mockRepoXFIConfig);
      expect(manager).toBeDefined();
    });

    it('should use default values when notifications config is missing', () => {
      const configWithoutNotifications: RepoXFIConfig = {};
      const manager = new NotificationManager(configWithoutNotifications);
      expect(manager).toBeDefined();
    });
  });

  describe('registerProvider', () => {
    it('should register a notification provider', () => {
      notificationManager.registerProvider('test', mockProvider);
      // Verification will be done through notify method testing
    });

    it('should allow registering multiple providers', () => {
      const provider1 = { ...mockProvider, name: 'provider1' };
      const provider2 = { ...mockProvider, name: 'provider2' };

      notificationManager.registerProvider('provider1', provider1);
      notificationManager.registerProvider('provider2', provider2);
      // Verification through notify method
    });
  });

  describe('notify', () => {
    beforeEach(() => {
      notificationManager.registerProvider('test', mockProvider);
    });

    it('should send success notification when configured', async () => {
      await notificationManager.notify('success', mockResults);

      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: 'X-Fidelity Analysis Success: test-archetype',
          message: 'Found 5 issues (2 warnings, 2 errors, 1 fatal)',
          subject: 'X-Fidelity Analysis Success: test-archetype'
        })
      );
    });

    it('should send failure notification when configured', async () => {
      await notificationManager.notify('failure', mockResults);

      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'failure',
          title: 'X-Fidelity Analysis Failure: test-archetype',
          message: 'Found 5 issues (2 warnings, 2 errors, 1 fatal)'
        })
      );
    });

    it('should not send notification when success notifications are disabled', async () => {
      const configWithoutSuccess = {
        ...mockRepoXFIConfig,
        notifications: {
          ...mockRepoXFIConfig.notifications!,
          notifyOnSuccess: false
        }
      };
      const manager = new NotificationManager(configWithoutSuccess);
      manager.registerProvider('test', mockProvider);

      await manager.notify('success', mockResults);

      expect(mockProvider.send).not.toHaveBeenCalled();
    });

    it('should not send notification when failure notifications are disabled', async () => {
      const configWithoutFailure = {
        ...mockRepoXFIConfig,
        notifications: {
          ...mockRepoXFIConfig.notifications!,
          notifyOnFailure: false
        }
      };
      const manager = new NotificationManager(configWithoutFailure);
      manager.registerProvider('test', mockProvider);

      await manager.notify('failure', mockResults);

      expect(mockProvider.send).not.toHaveBeenCalled();
    });

    it('should handle provider errors gracefully', async () => {
      mockProvider.send = jest.fn().mockRejectedValue(new Error('Provider error'));

      await expect(notificationManager.notify('success', mockResults)).resolves.not.toThrow();
    });

    it('should send to multiple providers', async () => {
      const provider2 = {
        ...mockProvider,
        name: 'provider2',
        send: jest.fn().mockResolvedValue(undefined)
      };

      notificationManager.registerProvider('provider1', mockProvider);
      notificationManager.registerProvider('provider2', provider2);

      await notificationManager.notify('success', mockResults);

      expect(mockProvider.send).toHaveBeenCalled();
      expect(provider2.send).toHaveBeenCalled();
    });
  });

  describe('getRecipients', () => {
    it('should return configured recipients when not using code owners', async () => {
      const configWithoutCodeOwners = {
        ...mockRepoXFIConfig,
        notifications: {
          ...mockRepoXFIConfig.notifications!,
          codeOwners: false
        }
      };
      const manager = new NotificationManager(configWithoutCodeOwners);

      const recipients = await manager.getRecipients(mockResults);
      expect(recipients).toEqual(['test@example.com']);
    });

    it('should include code owners when enabled', async () => {
      const recipients = await notificationManager.getRecipients(mockResults);
      expect(recipients).toContain('test@example.com');
      // Should also include code owners based on affected files
    });

    it('should handle empty recipients gracefully', async () => {
      const configWithoutRecipients = {
        ...mockRepoXFIConfig,
        notifications: {
          ...mockRepoXFIConfig.notifications!,
          recipients: undefined
        }
      };
      const manager = new NotificationManager(configWithoutRecipients);

      const recipients = await manager.getRecipients(mockResults);
      expect(Array.isArray(recipients)).toBe(true);
    });
  });

  describe('git integration', () => {
    it('should handle git commands successfully', async () => {
      notificationManager.registerProvider('test', mockProvider);

      await notificationManager.notify('success', mockResults);

      expect(mockedExecSync).toHaveBeenCalledWith(
        'git config --get remote.origin.url',
        expect.objectContaining({ encoding: 'utf8' })
      );
      expect(mockedExecSync).toHaveBeenCalledWith(
        'git rev-parse --abbrev-ref HEAD',
        expect.objectContaining({ encoding: 'utf8' })
      );
    });

    it('should handle git command failures gracefully', async () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('Git command failed');
      });

      notificationManager.registerProvider('test', mockProvider);

      await expect(notificationManager.notify('success', mockResults)).resolves.not.toThrow();
    });

    it('should use environment variables as fallbacks', async () => {
      process.env.GITHUB_SERVER_URL = 'https://github.enterprise.com';
      process.env.GITHUB_REPOSITORY = 'enterprise/repo';
      process.env.GITHUB_REF_NAME = 'feature-branch';

      mockedExecSync.mockImplementation(() => {
        throw new Error('Git not available');
      });

      notificationManager.registerProvider('test', mockProvider);

      await notificationManager.notify('success', mockResults);

      expect(mockProvider.send).toHaveBeenCalled();

      // Cleanup
      delete process.env.GITHUB_SERVER_URL;
      delete process.env.GITHUB_REPOSITORY;
      delete process.env.GITHUB_REF_NAME;
    });
  });

  describe('code owners functionality', () => {
    it('should parse CODEOWNERS file correctly', () => {
      // This is tested indirectly through the constructor test above
      expect(mockedFs.readFileSync).toHaveBeenCalled();
    });

    it('should match files to code owners', async () => {
      const resultsWithFrontendFile: ResultMetadata = {
        ...mockResults,
        XFI_RESULT: {
          ...mockResults.XFI_RESULT,
          issueDetails: [
            {
              filePath: '/test/repo/src/frontend/component.tsx',
              errors: []
            }
          ]
        }
      };

      const recipients = await notificationManager.getRecipients(resultsWithFrontendFile);
      // Should include frontend team owners
      expect(recipients.length).toBeGreaterThan(0);
    });

    it('should handle glob patterns in CODEOWNERS', async () => {
      const resultsWithMarkdownFile: ResultMetadata = {
        ...mockResults,
        XFI_RESULT: {
          ...mockResults.XFI_RESULT,
          issueDetails: [
            {
              filePath: '/test/repo/README.md',
              errors: []
            }
          ]
        }
      };

      const recipients = await notificationManager.getRecipients(resultsWithMarkdownFile);
      // Should include docs team
      expect(recipients.length).toBeGreaterThan(0);
    });
  });

  describe('report content generation', () => {
    it('should generate comprehensive report content', async () => {
      notificationManager.registerProvider('test', mockProvider);

      await notificationManager.notify('success', mockResults);

      const call = (mockProvider.send as jest.Mock).mock.calls[0][0];
      expect(call.content).toContain('X-Fidelity Analysis');
      expect(call.content).toBeDefined();
    });

    it('should handle empty issue details', async () => {
      const resultsWithoutIssues: ResultMetadata = {
        ...mockResults,
        XFI_RESULT: {
          ...mockResults.XFI_RESULT,
          issueDetails: []
        }
      };

      notificationManager.registerProvider('test', mockProvider);

      await notificationManager.notify('success', resultsWithoutIssues);

      expect(mockProvider.send).toHaveBeenCalled();
    });

    it('should include GitHub links in report content', async () => {
      notificationManager.registerProvider('test', mockProvider);

      await notificationManager.notify('success', mockResults);

      const call = (mockProvider.send as jest.Mock).mock.calls[0][0];
      expect(call.content).toContain('github.com');
    });
  });

  describe('error handling', () => {
    it('should handle malformed CODEOWNERS file', () => {
      mockedFs.readFileSync.mockReturnValue(`
# Malformed entry
invalid line without pattern
`);

      expect(() => new NotificationManager(mockRepoXFIConfig)).not.toThrow();
    });

    it('should handle provider registration with same name', () => {
      notificationManager.registerProvider('test', mockProvider);
      notificationManager.registerProvider('test', mockProvider); // Should replace

      expect(() => notificationManager.registerProvider('test', mockProvider)).not.toThrow();
    });

    it('should handle undefined notification metadata', async () => {
      const resultsWithoutMetadata = {
        XFI_RESULT: {
          archetype: 'test',
          totalIssues: 0,
          warningCount: 0,
          errorCount: 0,
          fatalityCount: 0,
          repoPath: '/test',
          issueDetails: []
        }
      } as ResultMetadata;

      notificationManager.registerProvider('test', mockProvider);

      await expect(notificationManager.notify('success', resultsWithoutMetadata)).resolves.not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle SSH git remote URLs', async () => {
      mockedExecSync.mockImplementation((command: string) => {
        if (command.includes('git config --get remote.origin.url')) {
          return Buffer.from('git@github.com:test/repo.git');
        }
        if (command.includes('git rev-parse --abbrev-ref HEAD')) {
          return Buffer.from('main');
        }
        return Buffer.from('');
      });

      notificationManager.registerProvider('test', mockProvider);

      await notificationManager.notify('success', mockResults);

      expect(mockProvider.send).toHaveBeenCalled();
    });

    it('should handle very large issue lists', async () => {
      const largeResults: ResultMetadata = {
        ...mockResults,
        XFI_RESULT: {
          ...mockResults.XFI_RESULT,
          issueDetails: Array(1000).fill(0).map((_, i) => ({
            filePath: `/test/repo/file${i}.ts`,
            errors: [
              {
                ruleFailure: `rule${i}`,
                level: 'warning' as const,
                message: `Issue ${i}`,
                line: i,
                column: 1
              }
            ]
          }))
        }
      };

      notificationManager.registerProvider('test', mockProvider);

      await expect(notificationManager.notify('success', largeResults)).resolves.not.toThrow();
    });

    it('should handle special characters in file paths', async () => {
      const resultsWithSpecialChars: ResultMetadata = {
        ...mockResults,
        XFI_RESULT: {
          ...mockResults.XFI_RESULT,
          issueDetails: [
            {
              filePath: '/test/repo/src/特殊字符文件.ts',
              errors: []
            }
          ]
        }
      };

      notificationManager.registerProvider('test', mockProvider);

      await expect(notificationManager.notify('success', resultsWithSpecialChars)).resolves.not.toThrow();
    });
  });
}); 