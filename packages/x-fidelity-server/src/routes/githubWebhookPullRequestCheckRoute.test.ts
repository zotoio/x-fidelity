import { githubWebhookPullRequestCheckRoute } from './githubWebhookPullRequestCheckRoute';
import { logger, setLogPrefix } from '../utils/serverLogger';
import crypto from 'crypto';

jest.mock('../utils/serverLogger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  },
  setLogPrefix: jest.fn(),
  ServerLogger: jest.fn()
}));

jest.mock('crypto', () => ({
  createHmac: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('digest')
  })
}));

// Mock child_process spawn to avoid actually executing git commands
jest.mock('child_process', () => ({
  spawn: jest.fn().mockImplementation(() => ({
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    on: jest.fn((event, callback) => {
      if (event === 'close') callback(0);
    }),
    kill: jest.fn()
  }))
}));

// Mock fs to prevent file system operations
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn()
  }
}));

// Mock @x-fidelity/core to prevent actual analysis
jest.mock('@x-fidelity/core', () => ({
  analyzeCodebase: jest.fn().mockResolvedValue({
    XFI_RESULT: { totalIssues: 0, errorCount: 0, warningCount: 0 }
  }),
  LoggerProvider: {
    getLoggerForMode: jest.fn().mockReturnValue({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    })
  }
}));

describe('githubWebhookPullRequestCheckRoute', () => {
  let mockRequest: any;
  let mockResponse: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    
    mockRequest = {
      headers: {
        'x-log-prefix': 'test-prefix',
        'x-hub-signature-256': 'sha256=digest',
        'x-github-event': 'push'
      },
      body: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('webhook authentication', () => {
    it('should return 500 when webhook secret is not set', async () => {
      delete process.env.GITHUB_WEBHOOK_SECRET;
      
      await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
      
      expect(setLogPrefix).toHaveBeenCalledWith('test-prefix');
      expect(logger.error).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith('Server is not configured for webhooks');
    });

    it('should return 400 when signature header is missing', async () => {
      process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
      delete mockRequest.headers['x-hub-signature-256'];
      
      await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
      
      expect(logger.error).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith('No X-Hub-Signature-256 found on request');
    });

    it('should return 400 when signature is invalid', async () => {
      process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
      mockRequest.headers['x-hub-signature-256'] = 'sha256=invalid';
      
      await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
      
      expect(logger.error).toHaveBeenCalledWith('Request body digest did not match X-Hub-Signature-256');
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith('Invalid signature');
    });
  });

  describe('event handling', () => {
    it('should process push event', async () => {
      process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
      
      await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith('Push check completed');
    });

    it('should handle non-push events', async () => {
      process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
      mockRequest.headers['x-github-event'] = 'issue';
      
      await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith('Received');
    });
  });

  describe('pull request security validation', () => {
    beforeEach(() => {
      process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
      mockRequest.headers['x-github-event'] = 'pull_request';
    });

    it('should handle missing pull_request in payload', async () => {
      mockRequest.body = { repository: { clone_url: 'https://github.com/owner/repo.git' } };
      
      await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
      
      expect(logger.warn).toHaveBeenCalledWith('Invalid pull request payload - missing pull_request or repository');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle missing repository in payload', async () => {
      mockRequest.body = { 
        pull_request: { 
          number: 1, 
          head: { sha: 'a'.repeat(40) }, 
          base: { sha: 'b'.repeat(40) } 
        } 
      };
      
      await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
      
      expect(logger.warn).toHaveBeenCalledWith('Invalid pull request payload - missing pull_request or repository');
    });

    it('should reject invalid clone URLs (non-GitHub)', async () => {
      mockRequest.body = {
        pull_request: { 
          number: 1, 
          head: { sha: 'a'.repeat(40) }, 
          base: { sha: 'b'.repeat(40) } 
        },
        repository: { clone_url: 'https://evil.com/malicious/repo.git' }
      };
      
      await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
      
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid clone URL'));
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid or unsafe repository URL'));
    });

    it('should reject HTTP clone URLs (non-HTTPS)', async () => {
      mockRequest.body = {
        pull_request: { 
          number: 1, 
          head: { sha: 'a'.repeat(40) }, 
          base: { sha: 'b'.repeat(40) } 
        },
        repository: { clone_url: 'http://github.com/owner/repo.git' }
      };
      
      await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
      
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Non-HTTPS clone URL'));
    });

    it('should reject invalid PR numbers (negative)', async () => {
      mockRequest.body = {
        pull_request: { 
          number: -1, 
          head: { sha: 'a'.repeat(40) }, 
          base: { sha: 'b'.repeat(40) } 
        },
        repository: { clone_url: 'https://github.com/owner/repo.git' }
      };
      
      await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
      
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid PR number'));
    });

    it('should reject invalid PR numbers (non-integer)', async () => {
      mockRequest.body = {
        pull_request: { 
          number: 'abc', 
          head: { sha: 'a'.repeat(40) }, 
          base: { sha: 'b'.repeat(40) } 
        },
        repository: { clone_url: 'https://github.com/owner/repo.git' }
      };
      
      await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
      
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid PR number'));
    });

    it('should reject invalid SHA formats (too short)', async () => {
      mockRequest.body = {
        pull_request: { 
          number: 1, 
          head: { sha: 'abc123' }, 
          base: { sha: 'b'.repeat(40) } 
        },
        repository: { clone_url: 'https://github.com/owner/repo.git' }
      };
      
      await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
      
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid SHA format'));
    });

    it('should reject invalid SHA formats (invalid characters)', async () => {
      mockRequest.body = {
        pull_request: { 
          number: 1, 
          head: { sha: 'g'.repeat(40) }, // 'g' is not valid hex
          base: { sha: 'b'.repeat(40) } 
        },
        repository: { clone_url: 'https://github.com/owner/repo.git' }
      };
      
      await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
      
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid SHA format'));
    });

    it('should reject clone URLs with invalid path format', async () => {
      mockRequest.body = {
        pull_request: { 
          number: 1, 
          head: { sha: 'a'.repeat(40) }, 
          base: { sha: 'b'.repeat(40) } 
        },
        // Invalid repo path format - doesn't match owner/repo pattern
        repository: { clone_url: 'https://github.com/malicious' }
      };
      
      await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
      
      // The URL validation rejects malformed repository paths
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid repository path format'));
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid or unsafe repository URL'));
    });
  });

  describe('push event security validation', () => {
    beforeEach(() => {
      process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
      mockRequest.headers['x-github-event'] = 'push';
    });

    it('should handle missing repository in push payload', async () => {
      mockRequest.body = { after: 'a'.repeat(40) };
      
      await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
      
      expect(logger.warn).toHaveBeenCalledWith('Invalid push payload - missing repository or sha');
    });

    it('should handle missing SHA in push payload', async () => {
      mockRequest.body = { 
        repository: { clone_url: 'https://github.com/owner/repo.git' } 
      };
      
      await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
      
      expect(logger.warn).toHaveBeenCalledWith('Invalid push payload - missing repository or sha');
    });

    it('should reject invalid SHA in push payload', async () => {
      mockRequest.body = { 
        repository: { clone_url: 'https://github.com/owner/repo.git' },
        after: 'invalid-sha'
      };
      
      await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
      
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid SHA format'));
    });

    it('should reject non-GitHub clone URLs in push payload', async () => {
      mockRequest.body = { 
        repository: { clone_url: 'https://gitlab.com/owner/repo.git' },
        after: 'a'.repeat(40)
      };
      
      await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
      
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid clone URL host'));
    });
  });

  describe('SSRF protection', () => {
    beforeEach(() => {
      process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
      mockRequest.headers['x-github-event'] = 'pull_request';
    });

    it('should block localhost in clone URL', async () => {
      mockRequest.body = {
        pull_request: { 
          number: 1, 
          head: { sha: 'a'.repeat(40) }, 
          base: { sha: 'b'.repeat(40) } 
        },
        repository: { clone_url: 'https://localhost/owner/repo.git' }
      };
      
      await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
      
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid clone URL'));
    });

    it('should block private IP in clone URL', async () => {
      mockRequest.body = {
        pull_request: { 
          number: 1, 
          head: { sha: 'a'.repeat(40) }, 
          base: { sha: 'b'.repeat(40) } 
        },
        repository: { clone_url: 'https://192.168.1.1/owner/repo.git' }
      };
      
      await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
      
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid clone URL'));
    });

    it('should block internal network IPs in clone URL', async () => {
      mockRequest.body = {
        pull_request: { 
          number: 1, 
          head: { sha: 'a'.repeat(40) }, 
          base: { sha: 'b'.repeat(40) } 
        },
        repository: { clone_url: 'https://10.0.0.1/owner/repo.git' }
      };
      
      await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
      
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid clone URL'));
    });
  });

  describe('command injection protection', () => {
    beforeEach(() => {
      process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
      mockRequest.headers['x-github-event'] = 'pull_request';
    });

    it('should reject SHA with command injection attempt', async () => {
      mockRequest.body = {
        pull_request: { 
          number: 1, 
          head: { sha: 'a'.repeat(40) + '; rm -rf /' }, 
          base: { sha: 'b'.repeat(40) } 
        },
        repository: { clone_url: 'https://github.com/owner/repo.git' }
      };
      
      await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
      
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid SHA format'));
    });

    it('should reject PR number with injection attempt', async () => {
      mockRequest.body = {
        pull_request: { 
          number: '1; rm -rf /', 
          head: { sha: 'a'.repeat(40) }, 
          base: { sha: 'b'.repeat(40) } 
        },
        repository: { clone_url: 'https://github.com/owner/repo.git' }
      };
      
      await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
      
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid PR number'));
    });
  });
});
