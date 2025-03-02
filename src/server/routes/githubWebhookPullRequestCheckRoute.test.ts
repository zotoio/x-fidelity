import { githubWebhookPullRequestCheckRoute } from './githubWebhookPullRequestCheckRoute';
import { logger, setLogPrefix } from '../../utils/logger';
import crypto from 'crypto';

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn()
  },
  setLogPrefix: jest.fn()
}));

jest.mock('crypto', () => ({
  createHmac: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('digest')
  })
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
      send: jest.fn().mockReturnThis()
    };
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

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

  it('should process push event', async () => {
    process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
    
    await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
    
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.send).toHaveBeenCalledWith('Webhook received and processed');
  });

  it('should handle non-push events', async () => {
    process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
    mockRequest.headers['x-github-event'] = 'issue';
    
    await githubWebhookPullRequestCheckRoute(mockRequest, mockResponse);
    
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.send).toHaveBeenCalledWith('Received');
  });
});
