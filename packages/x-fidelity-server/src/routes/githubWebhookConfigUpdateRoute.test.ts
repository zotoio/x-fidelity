import { githubWebhookConfigUpdateRoute } from './githubWebhookConfigUpdateRoute';
import { logger, setLogPrefix } from '../utils/serverLogger';
import crypto from 'crypto';
import axios from 'axios';
import fs from 'fs';
import { clearCache } from '../cacheManager';
import { ConfigManager } from '@x-fidelity/core';
import { options } from '@x-fidelity/core';

jest.mock('../utils/serverLogger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  },
  setLogPrefix: jest.fn()
}));

// Mock glob package to avoid native dependency issues in tests
jest.mock('glob', () => ({
  glob: jest.fn()
}));

jest.mock('@x-fidelity/core', () => ({
  ...jest.requireActual('@x-fidelity/core'),
  ConfigManager: {
    clearLoadedConfigs: jest.fn()
  },
  options: {
    localConfigPath: '/test/path'
  }
}));

jest.mock('crypto', () => ({
  createHmac: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('digest')
  })
}));

jest.mock('axios', () => {
  const mockAxios: any = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    create: jest.fn((): any => mockAxios),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  };
  return {
    ...mockAxios,
    default: mockAxios
  };
});

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn()
  }
}));

jest.mock('../cacheManager', () => ({
  clearCache: jest.fn()
}));



describe('githubWebhookConfigUpdateRoute', () => {
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
      body: {
        repository: {
          owner: {
            name: 'testOwner'
          },
          name: 'testRepo'
        },
        ref: 'refs/heads/main'
      }
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return 500 when webhook secret is not set', async () => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
    
    await githubWebhookConfigUpdateRoute(mockRequest, mockResponse);
    
    expect(setLogPrefix).toHaveBeenCalledWith('test-prefix');
    expect(logger.error).toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.send).toHaveBeenCalledWith('Server is not configured for webhooks');
  });

  it('should return 400 when signature header is missing', async () => {
    process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
    delete mockRequest.headers['x-hub-signature-256'];
    
    await githubWebhookConfigUpdateRoute(mockRequest, mockResponse);
    
    expect(logger.error).toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.send).toHaveBeenCalledWith('No X-Hub-Signature-256 found on request');
  });

  it('should return 400 when signature is invalid', async () => {
    process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
    mockRequest.headers['x-hub-signature-256'] = 'sha256=invalid';
    
    await githubWebhookConfigUpdateRoute(mockRequest, mockResponse);
    
    expect(logger.error).toHaveBeenCalledWith('Request body digest did not match X-Hub-Signature-256');
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.send).toHaveBeenCalledWith('Invalid signature');
  });

  it('should process push event and update local config', async () => {
    process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
    
    // Mock axios response for repository contents
    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: [
        { type: 'file', name: 'file1.json', download_url: 'https://raw.githubusercontent.com/testOwner/testRepo/main/file1.json', path: 'file1.json' },
        { type: 'dir', name: 'dir1', path: 'dir1' }
      ]
    });
    
    // Mock axios response for directory contents
    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: [
        { type: 'file', name: 'file2.json', download_url: 'https://raw.githubusercontent.com/testOwner/testRepo/main/dir1/file2.json', path: 'dir1/file2.json' }
      ]
    });
    
    // Mock axios response for file downloads (return arraybuffer)
    (axios.get as jest.Mock).mockResolvedValue({
      data: Buffer.from('mock file content')
    });
    
    await githubWebhookConfigUpdateRoute(mockRequest, mockResponse);
    
    expect(clearCache).toHaveBeenCalled();
    expect(ConfigManager.clearLoadedConfigs).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Cache and loaded configs cleared due to GitHub push event');
    expect(axios.get).toHaveBeenCalledWith('https://api.github.com/repos/testOwner/testRepo/contents', expect.any(Object));
    expect(fs.promises.mkdir).toHaveBeenCalled();
    expect(fs.promises.writeFile).toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.send).toHaveBeenCalledWith('Webhook received and processed');
  });

  it('should handle non-push events', async () => {
    process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
    mockRequest.headers['x-github-event'] = 'issue';
    
    await githubWebhookConfigUpdateRoute(mockRequest, mockResponse);
    
    expect(clearCache).not.toHaveBeenCalled();
    expect(ConfigManager.clearLoadedConfigs).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.send).toHaveBeenCalledWith('Received');
  });

  it('should handle errors during config update', async () => {
    process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
    (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    await githubWebhookConfigUpdateRoute(mockRequest, mockResponse);
    
    expect(clearCache).toHaveBeenCalled();
    expect(ConfigManager.clearLoadedConfigs).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('Error updating local config: Error: Network error');
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.send).toHaveBeenCalledWith('Webhook received and processed');
  });

  describe('repository validation security', () => {
    beforeEach(() => {
      process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
    });

    it('should reject invalid repository owner format', async () => {
      mockRequest.body.repository.owner.name = 'invalid owner with spaces';
      
      await githubWebhookConfigUpdateRoute(mockRequest, mockResponse);
      
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid repository owner'));
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith('Invalid repository information');
    });

    it('should reject repository owner with special characters', async () => {
      mockRequest.body.repository.owner.name = 'owner<script>';
      
      await githubWebhookConfigUpdateRoute(mockRequest, mockResponse);
      
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid repository owner'));
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject repository name with path traversal', async () => {
      mockRequest.body.repository.name = '../../../etc/passwd';
      
      await githubWebhookConfigUpdateRoute(mockRequest, mockResponse);
      
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid repository name'));
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject repository name with special characters', async () => {
      mockRequest.body.repository.name = 'repo;rm -rf /';
      
      await githubWebhookConfigUpdateRoute(mockRequest, mockResponse);
      
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid repository name'));
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject very long repository names', async () => {
      mockRequest.body.repository.name = 'a'.repeat(150);
      
      await githubWebhookConfigUpdateRoute(mockRequest, mockResponse);
      
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid repository name'));
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject branch name with path traversal', async () => {
      // The branch name extracted from ref would be '../../../etc/passwd' after split
      mockRequest.body.ref = 'refs/heads/..';
      
      await githubWebhookConfigUpdateRoute(mockRequest, mockResponse);
      
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid branch name'));
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject branch name with command injection', async () => {
      mockRequest.body.ref = 'refs/heads/main;rm -rf /';
      
      await githubWebhookConfigUpdateRoute(mockRequest, mockResponse);
      
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid branch name'));
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('payload validation security', () => {
    beforeEach(() => {
      process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
    });

    it('should reject missing repository in payload', async () => {
      mockRequest.body = { ref: 'refs/heads/main' };
      
      await githubWebhookConfigUpdateRoute(mockRequest, mockResponse);
      
      expect(logger.error).toHaveBeenCalledWith('Invalid GitHub webhook payload structure');
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject missing owner in payload', async () => {
      mockRequest.body.repository = { name: 'repo' };
      
      await githubWebhookConfigUpdateRoute(mockRequest, mockResponse);
      
      expect(logger.error).toHaveBeenCalledWith('Invalid GitHub webhook payload structure');
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject missing ref in payload', async () => {
      mockRequest.body = { 
        repository: { 
          owner: { name: 'owner' }, 
          name: 'repo' 
        } 
      };
      
      await githubWebhookConfigUpdateRoute(mockRequest, mockResponse);
      
      expect(logger.error).toHaveBeenCalledWith('Invalid GitHub webhook payload structure');
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('download URL validation security', () => {
    beforeEach(() => {
      process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
    });

    it('should skip files with non-GitHub download URLs', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: [
          { 
            type: 'file', 
            name: 'file1.json', 
            download_url: 'https://evil.com/malicious.json', 
            path: 'file1.json' 
          }
        ]
      });
      
      await githubWebhookConfigUpdateRoute(mockRequest, mockResponse);
      
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Skipping invalid download URL'));
      // File should not be downloaded
      expect(fs.promises.writeFile).not.toHaveBeenCalled();
    });

    it('should skip files with HTTP (non-HTTPS) download URLs', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: [
          { 
            type: 'file', 
            name: 'file1.json', 
            download_url: 'http://raw.githubusercontent.com/owner/repo/main/file.json', 
            path: 'file1.json' 
          }
        ]
      });
      
      await githubWebhookConfigUpdateRoute(mockRequest, mockResponse);
      
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Non-HTTPS download URL'));
    });

    it('should accept valid GitHub raw content URLs', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({
          data: [
            { 
              type: 'file', 
              name: 'file1.json', 
              download_url: 'https://raw.githubusercontent.com/owner/repo/main/file.json', 
              path: 'file1.json' 
            }
          ]
        })
        .mockResolvedValueOnce({
          data: Buffer.from('{}')
        });
      
      await githubWebhookConfigUpdateRoute(mockRequest, mockResponse);
      
      expect(fs.promises.writeFile).toHaveBeenCalled();
    });
  });

  describe('SSRF protection', () => {
    beforeEach(() => {
      process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
    });

    it('should block localhost download URLs', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: [
          { 
            type: 'file', 
            name: 'file1.json', 
            download_url: 'https://localhost/secret/data', 
            path: 'file1.json' 
          }
        ]
      });
      
      await githubWebhookConfigUpdateRoute(mockRequest, mockResponse);
      
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid download URL'));
    });

    it('should block internal IP download URLs', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: [
          { 
            type: 'file', 
            name: 'file1.json', 
            download_url: 'https://192.168.1.1/internal/data', 
            path: 'file1.json' 
          }
        ]
      });
      
      await githubWebhookConfigUpdateRoute(mockRequest, mockResponse);
      
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid download URL'));
    });
  });
});
