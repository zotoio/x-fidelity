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
});
